const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
router.use(authenticate);
const path = require("path");
const multer = require("multer");
const { ValidationError, NotFoundError, ForbiddenError } = require("../lib/errors");

const { z } = require("zod");

const checkAccess = (user, question) => {
  if (user.role === 'ADMIN') return;
  
  if (!question.userId) {
    if (user.role === 'EDITOR') return;
  } else {
    if (user.role === 'EDITOR' && question.userId === user.userId) return;
  }

  throw new ForbiddenError("Access denied");
};


const QuestionInput = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  date: z.string().date().default(() => new Date().toISOString().split("T")[0]),
  options: z.array(z.string()).optional().default([]),
  keywords: z.union([z.string(), z.array(z.string())]).optional(),
});

const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "..", "public", "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});




function formatQuestion(question) {
  return {
    ...question,
    date: question.date?.toISOString().split("T")[0],
    keywords: question.keywords ? question.keywords.map((k) => k.name) : [],  
    userName: question.user?.name || null,
    attemptCount: question._count?.attempts ?? 0,
    solved: question.attempts ? question.attempts.length > 0 : false,
    user: undefined,
    attempts: undefined,
    _count: undefined,
  };
}





// GET /questions
// List all questions
router.get("/", async (req, res) => {
  const { keyword } = req.query;


  const where = keyword
    ? { keywords: { some: { name: keyword } } }
    : {};


  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 5));  
  const skip = (page-1) * limit;

const [filteredQuestions, total] = await Promise.all([
    prisma.question.findMany({
        where,
        include: {
          keywords: true,
          user: true,
          attempts: { where: { userId: req.user.userId, isCorrect: true }, take: 1 },
          _count: { select: { attempts: true } },
        },
        orderBy: { id: "asc" },
        skip,
        take: limit,
    }),
    prisma.question.count({ where }),
]);
  res.json({
    data: filteredQuestions.map(formatQuestion),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
});

});


// GET /questions/:qId
// Show a specific question
router.get("/:qId", async (req, res) => {
  const qId = Number(req.params.qId);
  const question = await prisma.question.findUnique({
    where: { id: qId },
    include: {
        keywords: true,
        user: true,
        attempts: {where: { userId: req.user.userId, isCorrect: true }, take: 1 },
        _count: { select: { attempts: true } },
        },
  });

  if (!question) {
    req.log.warn({ qId }, "user tried to access nonexistent question");
    throw new NotFoundError("Question not found");

  }

  res.json(formatQuestion(question));
});

// POST /questions
// Create a new question
router.post("/", upload.single("image"), async (req, res) => {
  const { question, options, answer, keywords }  = QuestionInput.parse(req.body);


  const keywordsArray = Array.isArray(keywords) ? keywords : [];
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  checkAccess(req.user, question); //admin, editor, player check

  const newQuestion = await prisma.question.create({
    data: {
      question,
      userId: req.user.userId,
      date: new Date(),
      answer,
      imageUrl,
      keywords: {
        connectOrCreate: keywordsArray.map((kw) => ({
          where: { name: kw }, 
          create: { name: kw },
        })),
      },
    },
    include: { keywords: true, user: true },
  });

  res.status(201).json(formatQuestion(newQuestion));
});

// PUT /questions/:qId
// Edit a question
router.put("/:qId", upload.single("image"), isOwner, async (req, res) => {
  const qId = Number(req.params.qId);
  const { question, options, answer, keywords }  = QuestionInput.parse(req.body);
  
  const existingQuestion = await prisma.question.findUnique({ 
    where: { id: qId } 
  });

  checkAccess(req.user, question); //admin, editor, player check

  if (!existingQuestion) {
    req.log.warn({ qId }, "user tried to access nonexistent question");
    throw new NotFoundError("Question not found");

  }
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : existingQuestion.imageUrl;

  const keywordsArray = Array.isArray(keywords) ? keywords : [];
  
  const updatedQuestion = await prisma.question.update({
    where: { id: qId },
    data: {
      question,
      options,
      answer,
      imageUrl,
      keywords: {
        set: [], 
        connectOrCreate: keywordsArray.map((kw) => ({
          where: { name: kw },
          create: { name: kw },
        })),
      },
    },
    include: { keywords: true, user: true },
  });

  res.json(formatQuestion(updatedQuestion));
});


// DELETE /questions/:qId
// Delete a question
router.delete("/:qId", isOwner, async (req, res) => {
  const qId = Number(req.params.qId);

  const question = await prisma.question.findUnique({
    where: { id: qId },
    include: { keywords: true, user: true },
  });
  checkAccess(req.user, question); //admin, editor, player check
  if (!question) {
    req.log.warn({ qId }, "user tried to access nonexistent question");
    throw new NotFoundError("Question not found");
  }

  await prisma.question.delete({ where: { id: qId } });

  res.json({
    message: "Question deleted successfully",
    question: formatQuestion(question),
  });
});




// POST /api/questions/:qId/play
router.post("/:qId/play", async (req, res) => {
  const qId = Number(req.params.qId);
  const { answer: userGuess } = req.body; 
  let isCorrect = false;
  const question = await prisma.question.findUnique({ where: { id: qId } });
  if (!question) {
    req.log.warn({ qId }, "user tried to access nonexistent question");
    throw new NotFoundError("Question not found");
  }

  if(question.answer == userGuess) {
    isCorrect = true;
  }

  const attempt = await prisma.attempt.create({
    data: {
      userId: req.user.userId,
      questionId: qId,
      isCorrect: isCorrect, 
    },
  });

  res.status(201).json({
    id: attempt.id,
    correct: isCorrect, 
    submittedAnswer: userGuess,
    correctAnswer: question.answer,
    createdAt: attempt.createdAt 
  });
});


router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err?.message === "Only image files are allowed") {
    return res.status(400).json({ message: err.message });
  }
  next(err); 
});

module.exports = router;