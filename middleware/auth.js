'use strict';
/**
 * middleware/auth.js
 * Verifies the JWT token sent in the Authorization header.
 * Usage: router.get('/admin-only-route', requireAuth, handler)
 */

const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'UNAUTHORIZED — No token provided' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;   // { id, username, iat, exp }
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ error: `UNAUTHORIZED — ${msg}` });
  }
}

module.exports = { requireAuth };
