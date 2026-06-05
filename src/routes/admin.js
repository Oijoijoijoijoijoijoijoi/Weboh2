// src/routes/admin.js
const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const { ForbiddenError } = require("../lib/errors");

const isAdmin = (user) => {
  if (!user || user.role !== 'ADMIN') {
    throw new ForbiddenError("Administrative privileges required.");
  }
};

// PATCH /admin/users/:userId/role
router.patch("/users/:userId/role", authenticate, async (req, res) => {
  const targetUserId = Number(req.params.userId);
  const { newRole } = req.body;

  isAdmin(req.user);
  const validRoles = ["ADMIN", "EDITOR", "PLAYER"];
  if (!validRoles.includes(newRole)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: { role: newRole },
  });

  res.json({ message: "Role updated wohooo", user: updatedUser });
});

module.exports = router;