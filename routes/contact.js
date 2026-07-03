'use strict';
const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const db = require('../db/database');
const { requireAuth }    = require('../middleware/auth');
const { contactLimiter } = require('../middleware/rateLimit');

router.post('/', contactLimiter,
  [body('name').trim().notEmpty().isLength({max:120}),
   body('email').trim().isEmail().normalizeEmail(),
   body('subject').optional().isIn(['opportunity','freelance','collab','other']),
   body('message').trim().notEmpty().isLength({min:10,max:2000})],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { name, email, subject='other', message } = req.body;
    await db.run('INSERT INTO contact_messages (name,email,subject,message,ip_address) VALUES (?,?,?,?,?)',
      [name, email, subject, message, req.ip]);
    res.status(201).json({ message: 'MESSAGE_RECEIVED — Thank you, I will respond within 24 hours.' });
  }
);

router.get('/', requireAuth, async (req, res) => {
  const messages = await db.all('SELECT * FROM contact_messages ORDER BY created_at DESC');
  const unread   = await db.get('SELECT COUNT(*) as cnt FROM contact_messages WHERE is_read=0');
  res.json({ data: messages, unread: unread.cnt });
});

router.put('/read-all', requireAuth, async (req, res) => {
  await db.run('UPDATE contact_messages SET is_read=1 WHERE is_read=0');
  res.json({ message: 'ALL_MARKED_READ' });
});

router.put('/:id/read', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  await db.run('UPDATE contact_messages SET is_read=1 WHERE id=?', [id]);
  res.json({ message: 'MARKED_READ' });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  await db.run('DELETE FROM contact_messages WHERE id=?', [id]);
  res.json({ message: 'MESSAGE_DELETED' });
});

module.exports = router;
