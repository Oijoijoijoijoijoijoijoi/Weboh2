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

  const filteredPosts = questions.filter(post =>
    post.keywords.includes(keyword.toLowerCase())
  );

  res.json(filteredPosts);
});


// GET /questions/:postId
// Show a specific post
router.get("/:postId", (req, res) => {
  const postId = Number(req.params.postId);

  const post = questions.find((p) => p.id === postId);

  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  res.json(post);
});

// POST /questions
// Create a new post
router.post("/", (req, res) => {
  const { title, date, content, keywords } = req.body;

  if (!title || !date || !content) {
    return res.status(400).json({
      message: "title, date, and content are required"
    });
  }
  const maxId = Math.max(...questions.map(p => p.id), 0);

  const newPost = {
    id: questions.length ? maxId + 1 : 1,
    title, date, content,
    keywords: Array.isArray(keywords) ? keywords : []
  };
  questions.push(newPost);
  res.status(201).json(newPost);
});


// PUT /questions/:postId
// Edit a post
router.put("/:postId", (req, res) => {
  const postId = Number(req.params.postId);
  const { title, date, content, keywords } = req.body;

  const post = questions.find((p) => p.id === postId);

  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  if (!title || !date || !content) {
    return res.json({
      message: "title, date, and content are required"
    });
  }

  post.title = title;
  post.date = date;
  post.content = content;
  post.keywords = Array.isArray(keywords) ? keywords : [];

  res.json(post);
});


// DELETE /questions/:postId
// Delete a post
router.delete("/:postId", (req, res) => {
  const postId = Number(req.params.postId);

  const postIndex = questions.findIndex((p) => p.id === postId);

  if (postIndex === -1) {
    return res.status(404).json({ message: "Post not found" });
  }

  const deletedPost = questions.splice(postIndex, 1);

  res.json({
    message: "Post deleted successfully",
    post: deletedPost[0]
  });
});



module.exports = router;