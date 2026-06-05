const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const { ForbiddenError, ValidationError } = require("../lib/errors");
const multer = require("multer");
const path = require("path");
const fs = require('fs');
const csv = require('csv-parser');

const importUpload = multer({
  dest: 'uploads/imports/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname) === '.csv') {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});


router.post("/batch", authenticate, (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return next(new ForbiddenError("For Admin users only."));
  }
  
  importUpload.single("csvFile")(req, res, next);
}, async (req, res) => {
  if (!req.file) throw new ValidationError("Where the CSV at yo?");

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        const questionsToCreate = results.map(row => ({
          question: row.question,
          answer: row.answer,
          userId: req.user.userId,
        }));

        await prisma.question.createMany({ data: questionsToCreate });
        fs.unlinkSync(req.file.path);
        
        res.status(201).json({ message: `Successfully imported ${results.length} questions` });
      } catch (err) {
        req.log.error(err, "CSV import failed. Only lord knows why");
        res.status(500).json({ message: "Server go BOOM CSV broke it" });
      }
    });
});

module.exports = router;