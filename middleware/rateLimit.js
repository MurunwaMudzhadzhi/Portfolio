'use strict';
/**
 * middleware/rateLimit.js
 * Different rate limiters for different route groups.
 */

const rateLimit = require('express-rate-limit');

// Generic API limiter — 120 req / 15 min per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please try again later.' }
});

// Strict limiter for contact form — 5 submissions / hour per IP
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages sent — please wait before trying again.' }
});

// Auth limiter — 10 login attempts / 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts — please wait.' }
});

module.exports = { apiLimiter, contactLimiter, authLimiter };
