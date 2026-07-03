'use strict';
const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

router.get('/', async (req, res) => {
  const posts = await db.all('SELECT id,log_label,title,excerpt,published,view_count,created_at FROM blog_posts WHERE published=1 ORDER BY created_at DESC');
  res.json({ data: posts });
});

router.get('/admin/all', requireAuth, async (req, res) => {
  res.json({ data: await db.all('SELECT * FROM blog_posts ORDER BY created_at DESC') });
});

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  const post = await db.get('SELECT * FROM blog_posts WHERE id=? AND published=1', [id]);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  await db.run('UPDATE blog_posts SET view_count=view_count+1 WHERE id=?', [id]);
  res.json({ data: post });
});

const rules = [
  body('log_label').trim().notEmpty(), body('title').trim().notEmpty(),
  body('excerpt').trim().notEmpty(),   body('content').trim().notEmpty(),
  body('published').optional().isInt({ min:0, max:1 })
];

router.post('/', requireAuth, rules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { log_label, title, excerpt, content, published=1 } = req.body;
  const info = await db.run('INSERT INTO blog_posts (log_label,title,excerpt,content,published) VALUES (?,?,?,?,?)',
    [log_label, title, excerpt, content, published]);
  const created = await db.get('SELECT * FROM blog_posts WHERE id=?', [info.lastID]);
  res.status(201).json({ data: created, message: 'POST_CREATED' });
});

router.put('/:id', requireAuth, rules, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  if (!await db.get('SELECT id FROM blog_posts WHERE id=?', [id])) return res.status(404).json({ error: 'Post not found' });
  const { log_label, title, excerpt, content, published=1 } = req.body;
  await db.run("UPDATE blog_posts SET log_label=?,title=?,excerpt=?,content=?,published=?,updated_at=datetime('now') WHERE id=?",
    [log_label, title, excerpt, content, published, id]);
  res.json({ data: await db.get('SELECT * FROM blog_posts WHERE id=?', [id]), message: 'POST_UPDATED' });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  if (!await db.get('SELECT id FROM blog_posts WHERE id=?', [id])) return res.status(404).json({ error: 'Post not found' });
  await db.run('DELETE FROM blog_posts WHERE id=?', [id]);
  res.json({ message: 'POST_DELETED' });
});

module.exports = router;
