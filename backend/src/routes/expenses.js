// ─── Expenses Routes (Local SQLite DB) ───────────────────────────────────────
const express = require('express');
const router = express.Router();
const db = require('../db');
const { CATEGORIES } = require('../config');

// ── GET /api/expenses ──────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  try {
    const expenses = db.prepare('SELECT * FROM expenses ORDER BY timestamp DESC').all();
    res.json(expenses);
  } catch (err) {
    console.error('[expenses GET]', err.message);
    res.status(500).json({ error: 'Failed to fetch local expenses', detail: err.message });
  }
});

// ── POST /api/expenses ─────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  try {
    const { item, company, link, price, quantity, notes, user, category } = req.body;

    // Validation
    if (!item || !item.trim()) return res.status(400).json({ error: 'Item is required' });
    if (isNaN(parseFloat(price)) || parseFloat(price) < 0) return res.status(400).json({ error: 'Invalid price' });
    if (!CATEGORIES.includes(category)) return res.status(400).json({ error: `Category must be one of: ${CATEGORIES.join(', ')}` });

    const priceNum = parseFloat(price);
    const qtyNum   = Math.max(1, parseInt(quantity, 10) || 1);
    const total    = priceNum * qtyNum;
    
    // SQLite uses raw primitives
    const insert = db.prepare(`
      INSERT INTO expenses (item, company, link, price, quantity, notes, category, user_name, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = insert.run(
      item.trim(),
      (company || '').trim(),
      (link || '').trim(),
      priceNum,
      qtyNum,
      (notes || '').trim(),
      category.toLowerCase(),
      (user || '').trim(),
      total
    );

    // Fetch the newly created row
    const newExpense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      message: 'Local expense added successfully',
      expense: newExpense,
    });
  } catch (err) {
    console.error('[expenses POST]', err.message);
    res.status(500).json({ error: 'Failed to save local expense', detail: err.message });
  }
});

module.exports = router;
