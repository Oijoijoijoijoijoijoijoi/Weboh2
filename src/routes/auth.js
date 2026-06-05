const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");


const SECRET = process.env.JWT_SECRET;
// Here we will add all routes related to authentication
const { ValidationError, ConflictError, UnauthorizedError, ForbiddenError }
= require("../lib/errors");

router.post("/register", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name)
   throw new ValidationError("email, password and name are required");
  
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ConflictError("Email already registered");
  
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, password: hashed, name }});
  const token = jwt.sign({ userId: user.id,  role: user.role }, SECRET, { expiresIn: "1h" });
  
  res.status(201).json({ message: "User registered successfully", token });
});


router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    throw new ValidationError("email and password are required");
  
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new UnauthorizedError("Invalid credentials");
  
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new UnauthorizedError("Invalid credentials");

  const isValid = await bcrypt.compare(password, user.password);
  if(!isValid) {
    throw new ForbiddenError("Invalid credentials");
  }
  
  const token = jwt.sign({ userId: user.id, role: user.role }, SECRET, { expiresIn: "1h" });
  res.json({ token });
});

router.get("/me", authenticate, (req, res) => {
  res.json({ userId: req.user.userId, role: req.user.role });
});


module.exports = router; // This should be the last line