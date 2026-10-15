import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

// Ensure data and uploads directory exist
const dataDir = path.dirname(config.dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

export const db = new Database(config.dbPath);

// Enable WAL mode for better concurrency and foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('author', 'admin')),
      phone TEXT,
      city TEXT,
      joined_date TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      title TEXT NOT NULL,
      isbn TEXT,
      genre TEXT NOT NULL,
      publication_date TEXT,
      status TEXT NOT NULL,
      mrp REAL,
      author_royalty_per_copy REAL,
      total_copies_sold INTEGER DEFAULT 0,
      total_royalty_earned REAL DEFAULT 0,
      royalty_paid REAL DEFAULT 0,
      royalty_pending REAL DEFAULT 0,
      last_royalty_payout_date TEXT,
      print_partner TEXT,
      available_on TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      book_id TEXT,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      attachment_url TEXT,
      attachment_filename TEXT,
      category TEXT NOT NULL,
      ai_category TEXT NOT NULL,
      priority TEXT NOT NULL CHECK(priority IN ('Critical', 'High', 'Medium', 'Low')),
      ai_priority TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
      assigned_to TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL,
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS ticket_messages (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      message TEXT NOT NULL,
      is_ai_assisted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ticket_notes (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      admin_id TEXT NOT NULL,
      note TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_drafts (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      draft_content TEXT NOT NULL,
      model_used TEXT NOT NULL,
      token_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_author ON tickets(author_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
    CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_ticket ON ticket_messages(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_notes_ticket ON ticket_notes(ticket_id);
  `);
}
