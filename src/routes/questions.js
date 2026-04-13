const express = require("express");
const router = express.Router();

const questions = require("../data/questions");

// GET /questions
// List all questions
router.get("/", (req, res) => {
  const { keyword } = req.query;

  if (!keyword) {
    return res.json(questions);
  }

  const filteredQuestions = questions.filter(item =>
    item.question.toLowerCase().includes(keyword.toLowerCase())
  );

  res.json(filteredQuestions);
});


// GET /questions/:questionId
// Show a specific question
router.get("/:questionId", (req, res) => {
  const questionId = Number(req.params.questionId);

  const question = questions.find((p) => p.id === questionId);

  if (!question) {
    return res.status(404).json({ message: "Question not found" });
  }

  res.json(question);
});

// POST /questions
// Create a new question
router.post("/", (req, res) => {
  const { question, options, answer } = req.body;

  if (!question || !options || !answer) {
    return res.status(400).json({
      message: "question, options, and answer are required"
    });
  }
  const maxId = Math.max(...questions.map(p => p.id), 0);

  const newQuestion = {
    id: questions.length ? maxId + 1 : 1,
    question, options, answer,
  };
  questions.push(newQuestion);
  res.status(201).json(newQuestion);
});


// PUT /questions/:questionId
// Edit a question
router.put("/:questionId", (req, res) => {
  const questionId = Number(req.params.questionId);
  const { question, options, answer } = req.body;

  const currentQuestion = questions.find((p) => p.id === questionId);

  if (!currentQuestion) {
    return res.status(404).json({ message: "Question not found" });
  }

  if (!currentQuestion || !options || !answer) {
    return res.json({
      message: "question, options, and answer are required"
    });
  }

  currentQuestion.question = question;
  currentQuestion.options = options;
  currentQuestion.answer = answer;

  res.json(currentQuestion);
});


// DELETE /questions/:questionId
// Delete a question
router.delete("/:questionId", (req, res) => {
  const questionId = Number(req.params.questionId);

  const postIndex = questions.findIndex((p) => p.id === questionId);

  if (postIndex === -1) {
    return res.status(404).json({ message: "Question not found" });
  }

  const deletedPost = questions.splice(postIndex, 1);

  res.json({
    message: "Question deleted successfully",
    question: deletedPost[0]
  });
});



module.exports = router;