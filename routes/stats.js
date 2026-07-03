'use strict';
const router = require('express').Router();
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  const period = req.query.period || '-30 days';
  const [eventCounts, topProjects, topPosts, dailyContacts, unread, projects, posts, messages, projViews, postViews] = await Promise.all([
    db.all("SELECT event_type, COUNT(*) as cnt FROM analytics_events WHERE created_at >= datetime('now',?) GROUP BY event_type", [period]),
    db.all('SELECT title, view_count FROM projects ORDER BY view_count DESC LIMIT 5'),
    db.all('SELECT title, view_count FROM blog_posts ORDER BY view_count DESC LIMIT 5'),
    db.all("SELECT date(created_at) as day, COUNT(*) as cnt FROM contact_messages GROUP BY day ORDER BY day DESC LIMIT 14"),
    db.get('SELECT COUNT(*) as cnt FROM contact_messages WHERE is_read=0'),
    db.get('SELECT COUNT(*) as cnt FROM projects'),
    db.get('SELECT COUNT(*) as cnt FROM blog_posts'),
    db.get('SELECT COUNT(*) as cnt FROM contact_messages'),
    db.get('SELECT SUM(view_count) as s FROM projects'),
    db.get('SELECT SUM(view_count) as s FROM blog_posts'),
  ]);
  res.json({
    summary: { projects: projects.cnt, blog_posts: posts.cnt, messages: messages.cnt,
      unread_messages: unread.cnt, project_views: projViews.s||0, post_views: postViews.s||0 },
    event_counts: eventCounts, top_projects: topProjects, top_posts: topPosts,
    daily_contacts: dailyContacts, period
  });
});

module.exports = router;
