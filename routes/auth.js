'use strict';
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db      = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

router.post('/login', authLimiter,
  [body('username').trim().notEmpty(), body('password').notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { username, password } = req.body;
    const admin = await db.get('SELECT * FROM admins WHERE username=?', [username]);
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: admin.id, username: admin.username }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.json({ token, admin: { id: admin.id, username: admin.username }, message: 'LOGIN_OK' });
  }
);

router.get('/me', requireAuth, (req, res) => res.json({ admin: req.admin }));
module.exports = router;
