const Database = require('better-sqlite3');
const path = require('path');
const { DEFAULT_BUDGETS } = require('./config');

// Connect to a local SQLite database file in the backend directory
const dbPath = path.resolve(__dirname, '../../database.sqlite');
const db = new Database(dbPath);

// Initialize database schema
function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item TEXT NOT NULL,
      company TEXT,
      link TEXT,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      notes TEXT,
      category TEXT,
      user_name TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      total REAL NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS budget_categories (
      category TEXT PRIMARY KEY,
      budget REAL NOT NULL DEFAULT 0
    )
  `);

  // Seed default budgets if not already set
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM budget_categories').get();
  if (countRow.cnt === 0) {
    const insert = db.prepare('INSERT OR IGNORE INTO budget_categories (category, budget) VALUES (?, ?)');
    for (const [cat, amount] of Object.entries(DEFAULT_BUDGETS)) {
      insert.run(cat, amount);
    }
  }
}

initDB();

module.exports = db;
