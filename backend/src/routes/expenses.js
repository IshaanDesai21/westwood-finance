// ─── Expenses Routes (Local SQLite DB + Google Sheets dual-write) ─────────────
const express = require('express');
const router = express.Router();
const { CATEGORIES, SHEET_NAMES } = require('../config');
const { readSheet, appendRows } = require('../sheetsClient');

// ── GET /api/expenses ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const rows = await readSheet(SHEET_NAMES.EXPENSES);
    if (!rows || rows.length === 0) return res.json([]);

    // Check if header exists
    const startIndex = (rows[0][0] || '').toLowerCase() === 'item' ? 1 : 0;

    const expenses = rows.slice(startIndex).map((row, i) => ({
      id:        i + 1,
      item:      row[0] || '',
      company:   row[1] || '',
      link:      row[2] || '',
      price:     parseFloat(row[3]) || 0,
      quantity:  parseInt(row[4], 10) || 1,
      notes:     row[5] || '',
      category:  row[6] || 'miscellaneous',
      user:      row[7] || '',
      timestamp: row[8] || '',
      total:     parseFloat(row[9]) || 0,
    })).filter(e => e.item && e.item.trim() !== '');

    expenses.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(expenses);
  } catch (err) {
    console.error('[expenses GET]', err.message);
    res.status(500).json({ error: 'Failed to fetch expenses from Sheets', detail: err.message });
  }
});

// ── POST /api/expenses ─────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { item, company, link, price, quantity, notes, user, category } = req.body;

    if (!item || !item.trim()) return res.status(400).json({ error: 'Item is required' });
    if (isNaN(parseFloat(price)) || parseFloat(price) < 0) return res.status(400).json({ error: 'Invalid price' });
    if (!CATEGORIES.includes(category)) return res.status(400).json({ error: `Category must be one of: ${CATEGORIES.join(', ')}` });

    const priceNum = parseFloat(price);
    const qtyNum   = Math.max(1, parseInt(quantity, 10) || 1);
    const total    = priceNum * qtyNum;
    const timestamp = new Date().toISOString();

    const sheetRow = [
      item.trim(),
      (company || '').trim(),
      (link || '').trim(),
      priceNum.toFixed(2),
      qtyNum,
      (notes || '').trim(),
      category.toLowerCase(),
      (user || '').trim(),
      timestamp,
      total.toFixed(2),
    ];

    await appendRows(SHEET_NAMES.EXPENSES, [sheetRow]);

    res.status(201).json({
      message: 'Expense added successfully to Google Sheets',
      expense: {
        item: item.trim(),
        company, link, price: priceNum, quantity: qtyNum,
        notes, category, user, timestamp, total
      }
    });
  } catch (err) {
    console.error('[expenses POST]', err.message);
    res.status(500).json({ error: 'Failed to save expense to Google Sheets', detail: err.message });
  }
});

module.exports = router;
