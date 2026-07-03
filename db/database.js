'use strict';
const path    = require('path');
const fs      = require('fs');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH      = process.env.DB_PATH || './db/portfolio.sqlite';
const resolvedPath = path.resolve(DB_PATH);
fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

const rawDb = new sqlite3.Database(resolvedPath, err => {
  if (err) { console.error('[DB] Open error:', err.message); process.exit(1); }
  console.log('[DB] Connected:', resolvedPath);
});

const db = {
  run(sql, params = []) {
    return new Promise((res, rej) => rawDb.run(sql, params, function(err) {
      if (err) return rej(err);
      res({ lastID: this.lastID, changes: this.changes });
    }));
  },
  get(sql, params = []) {
    return new Promise((res, rej) => rawDb.get(sql, params, (err, row) => err ? rej(err) : res(row)));
  },
  all(sql, params = []) {
    return new Promise((res, rej) => rawDb.all(sql, params, (err, rows) => err ? rej(err) : res(rows)));
  }
};

rawDb.serialize(() => {
  rawDb.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT NOT NULL, title TEXT NOT NULL,
      description TEXT NOT NULL, stack TEXT NOT NULL,
      detail_body TEXT, github_url TEXT, live_url TEXT,
      published INTEGER NOT NULL DEFAULT 1,
      view_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS blog_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      log_label TEXT NOT NULL, title TEXT NOT NULL,
      excerpt TEXT NOT NULL, content TEXT NOT NULL,
      published INTEGER NOT NULL DEFAULT 1,
      view_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, email TEXT NOT NULL,
      subject TEXT NOT NULL DEFAULT 'other',
      message TEXT NOT NULL, ip_address TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      replied_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL, ref_id INTEGER,
      ip_address TEXT, user_agent TEXT, referrer TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_blog_pub  ON blog_posts(published,created_at);
    CREATE INDEX IF NOT EXISTS idx_proj_pub  ON projects(published,number);
    CREATE INDEX IF NOT EXISTS idx_msg_read  ON contact_messages(is_read,created_at);
  `, err => { if (err) console.error('[DB] Schema error:', err.message); });
});

module.exports = db;
