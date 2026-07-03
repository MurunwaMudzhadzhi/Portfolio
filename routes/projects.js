'use strict';
const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

async function logEvent(req, type, id) {
  try { await db.run('INSERT INTO analytics_events (event_type,ref_id,ip_address,user_agent,referrer) VALUES (?,?,?,?,?)',
    [type, id, req.ip, req.headers['user-agent']||null, req.headers['referer']||null]); } catch(_) {}
}

router.get('/', async (req, res) => {
  const rows = await db.all('SELECT * FROM projects WHERE published=1 ORDER BY number ASC');
  res.json({ data: rows.map(p => ({ ...p, stack: JSON.parse(p.stack) })) });
});

router.get('/admin/all', requireAuth, async (req, res) => {
  const rows = await db.all('SELECT * FROM projects ORDER BY number ASC');
  res.json({ data: rows.map(p => ({ ...p, stack: JSON.parse(p.stack) })) });
});

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  const project = await db.get('SELECT * FROM projects WHERE id=? AND published=1', [id]);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  await db.run('UPDATE projects SET view_count=view_count+1 WHERE id=?', [id]);
  logEvent(req, 'project_view', id);
  res.json({ data: { ...project, stack: JSON.parse(project.stack) } });
});

const rules = [
  body('number').trim().notEmpty(), body('title').trim().notEmpty(),
  body('description').trim().notEmpty(), body('stack').isArray({ min: 1 }),
  body('published').optional().isInt({ min:0, max:1 })
];

router.post('/', requireAuth, rules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { number, title, description, stack, detail_body, github_url, live_url, published=1 } = req.body;
  const info = await db.run(
    'INSERT INTO projects (number,title,description,stack,detail_body,github_url,live_url,published) VALUES (?,?,?,?,?,?,?,?)',
    [number, title, description, JSON.stringify(stack), detail_body||null, github_url||null, live_url||null, published]
  );
  const created = await db.get('SELECT * FROM projects WHERE id=?', [info.lastID]);
  res.status(201).json({ data: { ...created, stack }, message: 'PROJECT_CREATED' });
});

router.put('/:id', requireAuth, rules, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const existing = await db.get('SELECT * FROM projects WHERE id=?', [id]);
  if (!existing) return res.status(404).json({ error: 'Project not found' });
  const { number, title, description, stack, detail_body, github_url, live_url, published=1 } = req.body;
  await db.run(
    'UPDATE projects SET number=?,title=?,description=?,stack=?,detail_body=?,github_url=?,live_url=?,published=?,updated_at=datetime(\'now\') WHERE id=?',
    [number, title, description, JSON.stringify(stack), detail_body||null, github_url||null, live_url||null, published, id]
  );
  const updated = await db.get('SELECT * FROM projects WHERE id=?', [id]);
  res.json({ data: { ...updated, stack }, message: 'PROJECT_UPDATED' });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  const existing = await db.get('SELECT * FROM projects WHERE id=?', [id]);
  if (!existing) return res.status(404).json({ error: 'Project not found' });
  await db.run('DELETE FROM projects WHERE id=?', [id]);
  res.json({ message: 'PROJECT_DELETED' });
});

module.exports = router;
