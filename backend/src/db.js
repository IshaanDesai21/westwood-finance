const Database = require('better-sqlite3');
const path = require('path');

// Connect to a local SQLite database file in the backend directory
const dbPath = path.resolve(__dirname, '../../database.sqlite');
const db = new Database(dbPath, { verbose: console.log });

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
}

initDB();

module.exports = db;
