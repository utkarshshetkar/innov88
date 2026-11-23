const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

// Fallback secret so it never fails even if middleware.js didn't export it
const JWT_SECRET = process.env.JWT_SECRET || 'room-booking-secret-dev-key';

// Institutional emails reserved for authorities
const PROTECTED_EMAILS = [
  'yash.coordinator@college.edu',
  'utkarsh.faculty@college.edu',
  'vihaan.incharge@college.edu',
  'boss.hod@college.edu',
  'coordinator@college.edu',
  'faculty@college.edu',
  'incharge@college.edu',
  'hod@college.edu'
];

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, designation = 'Student' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (PROTECTED_EMAILS.includes(cleanEmail)) {
      return res.status(403).json({
        error: 'Security Error: This institutional email is reserved for authorities.'
      });
    }

    const existing = db.prepare('SELECT id, is_protected FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const enforcedRole = 'student';
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    db.prepare(`
      INSERT INTO users (id, name, email, password, role, designation, is_protected)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(userId, name.trim(), cleanEmail, hashedPassword, enforcedRole, designation);

    const token = jwt.sign(
      { id: userId, name: name.trim(), email: cleanEmail, role: enforcedRole, designation },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Student account registered successfully',
      token,
      user: { id: userId, name: name.trim(), email: cleanEmail, role: enforcedRole, designation }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        designation: user.designation || user.role,
        is_protected: user.is_protected || 0
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        designation: user.designation || user.role,
        is_protected: user.is_protected || 0
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Authentication error' });
  }
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const token = header.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ user: decoded });
  } catch {
    res.status(401).json({ error: 'Invalid session' });
  }
});

module.exports = router;