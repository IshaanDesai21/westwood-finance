// ─── Expenses Routes ──────────────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { readSheet, appendRows } = require('../sheetsClient');
const cache = require('../cache');
const { SHEET_NAMES, EXPENSE_COLS, CATEGORIES } = require('../config');

const CACHE_KEY = 'expenses';

/**
 * Parse raw sheet rows into expense objects.
 * Skips the header row and the GRAND TOTAL row.
 */
function parseExpenses(rows) {
  if (!rows || rows.length === 0) return [];

  // Skip the first row if it looks like a header
  const startIndex = isHeaderRow(rows[0]) ? 1 : 0;

  return rows.slice(startIndex)
    .filter(row => !isGrandTotalRow(row))
    .map((row, idx) => ({
      id:        startIndex + idx + 1,         // 1-based sheet row number (for reference)
      item:      safeGet(row, EXPENSE_COLS.ITEM),
      company:   safeGet(row, EXPENSE_COLS.COMPANY),
      link:      safeGet(row, EXPENSE_COLS.LINK),
      price:     parseFloat(safeGet(row, EXPENSE_COLS.PRICE)) || 0,
      quantity:  parseInt(safeGet(row, EXPENSE_COLS.QUANTITY), 10) || 1,
      notes:     safeGet(row, EXPENSE_COLS.NOTES),
      category:  normCategory(safeGet(row, EXPENSE_COLS.CATEGORY)),
      user:      safeGet(row, EXPENSE_COLS.USER),
      timestamp: safeGet(row, EXPENSE_COLS.TIMESTAMP),
      total:     parseFloat(safeGet(row, EXPENSE_COLS.TOTAL)) || 0,
    }))
    .filter(e => e.item); // skip completely empty rows
}

function isHeaderRow(row) {
  const first = (row[0] || '').toString().toLowerCase();
  return first === 'item' || first === 'name';
}

function isGrandTotalRow(row) {
  const first = (row[0] || '').toString().toUpperCase();
  return first.includes('GRAND') || first.includes('TOTAL') || first.includes('SUM');
}

function safeGet(row, idx) {
  return (row[idx] || '').toString().trim();
}

function normCategory(cat) {
  const lower = cat.toLowerCase();
  return CATEGORIES.includes(lower) ? lower : 'miscellaneous';
}

// ── GET /api/expenses ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    // ?sync=true bypasses the cache (used by the Sync button)
    if (req.query.sync === 'true') {
      cache.invalidate(CACHE_KEY);
    }

    const cached = cache.get(CACHE_KEY);
    if (cached) return res.json(cached);

    const rows = await readSheet(SHEET_NAMES.EXPENSES);
    const expenses = parseExpenses(rows);
    cache.set(CACHE_KEY, expenses);
    res.json(expenses);
  } catch (err) {
    console.error('[expenses GET]', err.message);
    res.status(500).json({ error: 'Failed to fetch expenses', detail: err.message });
  }
});

// ── POST /api/expenses ─────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { item, company, link, price, quantity, notes, user, category } = req.body;

    // Validation
    if (!item || !item.trim()) return res.status(400).json({ error: 'Item is required' });
    if (isNaN(parseFloat(price)) || parseFloat(price) < 0) return res.status(400).json({ error: 'Invalid price' });
    if (!CATEGORIES.includes(category)) return res.status(400).json({ error: `Category must be one of: ${CATEGORIES.join(', ')}` });

    const priceNum = parseFloat(price);
    const qtyNum   = Math.max(1, parseInt(quantity, 10) || 1);
    const total    = (priceNum * qtyNum).toFixed(2);
    const timestamp = new Date().toISOString();

    const newRow = [
      item.trim(),
      (company || '').trim(),
      (link || '').trim(),
      priceNum.toFixed(2),
      qtyNum,
      (notes || '').trim(),
      category.toLowerCase(),
      (user || '').trim(),
      timestamp,
      total,
    ];

    await appendRows(SHEET_NAMES.EXPENSES, [newRow]);
    cache.invalidate(CACHE_KEY); // force fresh fetch next time

    res.status(201).json({
      message: 'Expense added successfully',
      expense: {
        item: item.trim(), company, link, price: priceNum, quantity: qtyNum,
        notes, category, user, timestamp, total: parseFloat(total),
      },
    });
  } catch (err) {
    console.error('[expenses POST]', err.message);
    res.status(500).json({ error: 'Failed to save expense', detail: err.message });
  }
});

module.exports = router;
