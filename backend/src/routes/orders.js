// ─── Part Orders Routes (Google Sheets) ───────────────────────────────────────
const express = require('express');
const router = express.Router();
const { readSheet, appendRows } = require('../sheetsClient');
const cache = require('../cache');
const { SHEET_NAMES, ORDER_COLS, CATEGORIES } = require('../config');

const CACHE_KEY = 'orders';

/**
 * Parse raw sheet rows into order objects.
 */
function parseOrders(rows) {
  if (!rows || rows.length === 0) return [];
  const startIndex = isHeaderRow(rows[0]) ? 1 : 0;

  return rows.slice(startIndex)
    .filter(row => !isGrandTotalRow(row))
    .map((row, idx) => ({
      id:        startIndex + idx + 1,
      item:      safeGet(row, ORDER_COLS.ITEM),
      company:   safeGet(row, ORDER_COLS.COMPANY),
      link:      safeGet(row, ORDER_COLS.LINK),
      price:     parseFloat(safeGet(row, ORDER_COLS.PRICE)) || 0,
      quantity:  parseInt(safeGet(row, ORDER_COLS.QUANTITY), 10) || 1,
      notes:     safeGet(row, ORDER_COLS.NOTES),
      category:  normCategory(safeGet(row, ORDER_COLS.CATEGORY)),
      user:      safeGet(row, ORDER_COLS.USER),
      timestamp: safeGet(row, ORDER_COLS.TIMESTAMP),
      total:     parseFloat(safeGet(row, ORDER_COLS.TOTAL)) || 0,
    }))
    .filter(e => e.item); // skip empty rows
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

// ── GET /api/orders ────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    if (req.query.sync === 'true') {
      cache.invalidate(CACHE_KEY);
    }
    const cached = cache.get(CACHE_KEY);
    if (cached) return res.json(cached);

    const rows = await readSheet(SHEET_NAMES.ORDERS);
    const orders = parseOrders(rows);
    cache.set(CACHE_KEY, orders);
    res.json(orders);
  } catch (err) {
    console.error('[orders GET]', err.message);
    res.status(500).json({ error: 'Failed to fetch orders from Sheets', detail: err.message });
  }
});

// ── POST /api/orders ───────────────────────────────────────────────────────────
// Just in case they want the website to push to the Orders sheet too.
router.post('/', async (req, res) => {
  try {
    const { item, company, link, price, quantity, notes, user, category } = req.body;

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

    await appendRows(SHEET_NAMES.ORDERS, [newRow]);
    cache.invalidate(CACHE_KEY);

    res.status(201).json({
      message: 'Order added successfully to Sheet',
      order: {
        item: item.trim(), company, link, price: priceNum, quantity: qtyNum,
        notes, category, user, timestamp, total: parseFloat(total),
      },
    });
  } catch (err) {
    console.error('[orders POST]', err.message);
    res.status(500).json({ error: 'Failed to save order to Sheet', detail: err.message });
  }
});

module.exports = router;
