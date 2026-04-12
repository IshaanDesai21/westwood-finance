// ─── Budget Routes (Category Budgets — SQLite backed) ─────────────────────────
const express = require('express');
const router = express.Router();
const { ADMIN_PASSWORD, CATEGORIES, DEFAULT_BUDGETS, SHEET_NAMES } = require('../config');
const { readSheet, appendRows, updateRow } = require('../sheetsClient');

// ── GET /api/budget ────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const rows = await readSheet(SHEET_NAMES.BUDGETS);
    const budgets = {};
    
    // Header check
    const startIndex = (rows[0] && (rows[0][0] || '').toLowerCase() === 'category') ? 1 : 0;

    rows.slice(startIndex).forEach(row => {
      const cat = (row[0] || '').toLowerCase().trim();
      const val = parseFloat(row[1]) || 0;
      if (CATEGORIES.includes(cat)) {
        budgets[cat] = val;
      }
    });

    // Ensure all categories are represented (fallback to defaults)
    for (const cat of CATEGORIES) {
      if (budgets[cat] === undefined) budgets[cat] = DEFAULT_BUDGETS[cat] || 0;
    }
    const total = Object.values(budgets).reduce((s, v) => s + v, 0);
    res.json({ budgets, total });
  } catch (err) {
    console.error('[budget GET]', err.message);
    res.status(500).json({ error: 'Failed to fetch budget data from Sheets', detail: err.message });
  }
});

// ── PUT /api/budget ────────────────────────────────────────────────────────────
router.put('/', async (req, res) => {
  try {
    const { password, budgets } = req.body;
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }
    if (!budgets || typeof budgets !== 'object') {
      return res.status(400).json({ error: 'budgets object is required' });
    }

    // Fetch existing rows to find where to update
    const currentRows = await readSheet(SHEET_NAMES.BUDGETS);
    const headersExist = (currentRows[0] && (currentRows[0][0] || '').toLowerCase() === 'category');
    
    if (!headersExist) {
      // Initialize sheet if empty
      const initData = [['Category', 'Amount']];
      for (const cat of CATEGORIES) {
        initData.push([cat, (parseFloat(budgets[cat]) || DEFAULT_BUDGETS[cat] || 0).toString()]);
      }
      await appendRows(SHEET_NAMES.BUDGETS, initData);
    } else {
      // Update each category
      for (const cat of CATEGORIES) {
        const val = (parseFloat(budgets[cat]) || 0).toString();
        const existingIdx = currentRows.findIndex(r => r[0]?.toLowerCase().trim() === cat);
        
        if (existingIdx !== -1) {
          // Update existing row (index + 1)
          await updateRow(SHEET_NAMES.BUDGETS, existingIdx + 1, [cat, val]);
        } else {
          // Append new category
          await appendRows(SHEET_NAMES.BUDGETS, [[cat, val]]);
        }
      }
    }

    // Refresh and return
    const updatedRows = await readSheet(SHEET_NAMES.BUDGETS);
    const result = {};
    updatedRows.slice(1).forEach(r => { result[r[0]] = parseFloat(r[1]) || 0; });
    const total = Object.values(result).reduce((s, v) => s + v, 0);

    res.json({ message: 'Budget updated in Sheets', budgets: result, total });
  } catch (err) {
    console.error('[budget PUT]', err.message);
    res.status(500).json({ error: 'Failed to update budget in Sheets', detail: err.message });
  }
});

module.exports = router;
