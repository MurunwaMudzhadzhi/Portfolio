'use strict';
require('dotenv').config();

const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const morgan  = require('morgan');
const path    = require('path');

const { apiLimiter } = require('./middleware/rateLimit');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, cb) => (!origin || allowedOrigins.includes(origin)) ? cb(null, true) : cb(new Error(`CORS: origin "${origin}" not allowed`)),
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));
app.set('trust proxy', 1);

// Serve portfolio frontend
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'OK', uptime: Math.floor(process.uptime()) }));

// API routes
app.use('/api', apiLimiter);
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/blog',     require('./routes/blog'));
app.use('/api/contact',  require('./routes/contact'));
app.use('/api/stats',    require('./routes/stats'));

// Catch-all: return index.html for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` }));
app.use((err, req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║   MURUNWA PORTFOLIO — ONLINE                 ║
  ║   http://localhost:${PORT}                      ║
  ╚══════════════════════════════════════════════╝
  `);
});

module.exports = app;
