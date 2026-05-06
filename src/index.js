const express = require("express");
const app = express();

const questionsRouter = require("./routes/questions"); 
const authRouter = require("./routes/auth");
const prisma = require("./lib/prisma");
const path = require("path");
app.use(express.static(path.join(__dirname, '..', 'public')));


app.use(express.json());
app.use("/api/auth", authRouter);
// everything under /api/questions
app.use("/api/questions", questionsRouter);

app.use((req, res) => {
  res.json({msg: "Not found"});
});


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error" });
});


app.listen(3000, () => {
  console.log("Server running on port 3000");
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
