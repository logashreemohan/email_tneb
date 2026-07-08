const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (user && (await user.matchPassword(password))) {
      res.json({
        user: { id: user.id, email: user.email },
        role: user.role,
        token: generateToken(user.id),
      });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register (for initial setup)
router.post('/register', async (req, res) => {
  const { email, password, role } = req.body;
  
  // Security: only allow manager registrations publicly
  const finalRole = role === 'admin' ? 'manager' : (role || 'manager');

  try {
    const userExists = await User.findOne({ where: { email } });
    if (userExists) return res.status(400).json({ error: 'User already exists' });

    const user = await User.create({ email, password, role: finalRole });
    res.status(201).json({
      user: { id: user.id, email: user.email },
      role: user.role,
      token: generateToken(user.id),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
