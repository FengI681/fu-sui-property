const path = require('path');
const fs = require('fs');
const express = require('express');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'inquiries.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const NAME_MAX = 30;
const PHONE_MAX = 30;
const EMAIL_MAX = 80;
const MESSAGE_MAX = 500;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 送出客戶詢問。詢問資料為客戶隱私，只寫入資料庫、不提供公開讀取端點。
app.post('/api/inquiries', (req, res) => {
  const body = req.body || {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!name || !phone || !message) {
    return res.status(400).json({ error: '請填寫姓名、聯絡電話與需求。' });
  }
  if (name.length > NAME_MAX || phone.length > PHONE_MAX || email.length > EMAIL_MAX || message.length > MESSAGE_MAX) {
    return res.status(400).json({ error: '輸入內容超過長度上限，請縮短後再送出。' });
  }

  db.prepare('INSERT INTO inquiries (name, phone, email, message) VALUES (?, ?, ?, ?)')
    .run(name, phone, email || null, message);

  res.status(201).json({ ok: true });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
