// ─── Budget Routes (Category Budgets — SQLite backed) ─────────────────────────
const express = require('express');
const router = express.Router();
const db = require('../db');
const { ADMIN_PASSWORD, CATEGORIES, DEFAULT_BUDGETS } = require('../config');

// ── GET /api/budget ────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT category, budget FROM budget_categories').all();
    const budgets = {};
    for (const row of rows) {
      budgets[row.category] = row.budget;
    }
    // Ensure all categories are represented (fallback to defaults)
    for (const cat of CATEGORIES) {
      if (budgets[cat] === undefined) budgets[cat] = DEFAULT_BUDGETS[cat] || 0;
    }
    const total = Object.values(budgets).reduce((s, v) => s + v, 0);
    res.json({ budgets, total });
  } catch (err) {
    console.error('[budget GET]', err.message);
    res.status(500).json({ error: 'Failed to fetch budget data', detail: err.message });
  }
});

// ── PUT /api/budget ────────────────────────────────────────────────────────────
// Body: { password, budgets: { hardware, software, outreach, food, miscellaneous } }
router.put('/', (req, res) => {
  try {
    const { password, budgets } = req.body;
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }
    if (!budgets || typeof budgets !== 'object') {
      return res.status(400).json({ error: 'budgets object is required' });
    }

    const upsert = db.prepare(`
      INSERT INTO budget_categories (category, budget)
      VALUES (?, ?)
      ON CONFLICT(category) DO UPDATE SET budget = excluded.budget
    `);

    const updateAll = db.transaction(() => {
      for (const cat of CATEGORIES) {
        const val = parseFloat(budgets[cat]);
        if (!isNaN(val) && val >= 0) {
          upsert.run(cat, val);
        }
      }
    });
    updateAll();

    // Return updated budgets
    const rows = db.prepare('SELECT category, budget FROM budget_categories').all();
    const result = {};
    for (const row of rows) result[row.category] = row.budget;
    const total = Object.values(result).reduce((s, v) => s + v, 0);

    res.json({ message: 'Budget updated', budgets: result, total });
  } catch (err) {
    console.error('[budget PUT]', err.message);
    res.status(500).json({ error: 'Failed to update budget', detail: err.message });
  }
});

module.exports = router;
