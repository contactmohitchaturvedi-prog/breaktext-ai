
import fs from 'fs';
import path from 'path';

const storageDir = process.env.DATA_DIR || (process.env.NODE_ENV === 'production' ? '/app/data' : path.resolve('.'));
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}
const DB_PATH = path.join(storageDir, 'breaktext.db');

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
if (!fs.existsSync(path.dirname(DB_PATH))) { fs.mkdirSync(path.dirname(DB_PATH), { recursive: true }); }
const sqlite = new DatabaseSync(DB_PATH);

const db = {
  exec: (sql) => sqlite.exec(sql),
  prepare: (sql) => {
    const stmt = sqlite.prepare(sql);
    return {
      run: (...args) => {
        const res = stmt.run(...args);
        return {
          lastInsertRowid: Number(res.lastInsertRowid),
          changes: res.changes
        };
      },
      get: (...args) => stmt.get(...args),
      all: (...args) => stmt.all(...args)
    };
  }
};

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    tier TEXT DEFAULT 'free',
    words_used INTEGER DEFAULT 0,
    words_limit INTEGER DEFAULT 1500,
    stripe_customer_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT DEFAULT 'New Conversation',
    system_prompt TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    ai_score_turnitin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(conversation_id) REFERENCES conversations(id)
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

export default db;