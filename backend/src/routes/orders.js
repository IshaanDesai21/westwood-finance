// ─── Orders Routes (Google Sheets) ───────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { readSheet, appendRows, updateRow } = require('../sheetsClient');
const cache = require('../cache');
const { SHEET_NAMES, ORDER_COLS, CATEGORIES, ORDER_STATUSES } = require('../config');

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
      rowIndex:  startIndex + idx + 2, // 1-indexed for Sheets (header is row 1)
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
      status:    safeGet(row, ORDER_COLS.STATUS) || 'Submitted and in review',
      tracking:  safeGet(row, ORDER_COLS.STATUS + 1) || '', // col L = tracking info
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
    const status   = 'Submitted and in review';

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
      status,
      '', // tracking column (col L)
    ];

    await appendRows(SHEET_NAMES.ORDERS, [newRow]);
    cache.invalidate(CACHE_KEY);

    res.status(201).json({
      message: 'Order added successfully to Sheet',
      order: {
        item: item.trim(), company, link, price: priceNum, quantity: qtyNum,
        notes, category, user, timestamp, total: parseFloat(total), status,
      },
    });
  } catch (err) {
    console.error('[orders POST]', err.message);
    res.status(500).json({ error: 'Failed to save order to Sheet', detail: err.message });
  }
});

// ── PATCH /api/orders/:rowIndex/status ────────────────────────────────────────
// rowIndex is the 1-based Sheets row index (returned in order objects as rowIndex)
router.patch('/:rowIndex/status', async (req, res) => {
  try {
    const rowIndex = parseInt(req.params.rowIndex, 10);
    const { status, tracking } = req.body;

    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${ORDER_STATUSES.join(', ')}` });
    }

    // Fetch current row to preserve all existing data
    const rows = await readSheet(SHEET_NAMES.ORDERS);
    const row = rows[rowIndex - 1]; // convert to 0-indexed
    if (!row) return res.status(404).json({ error: 'Order row not found' });

    // Update status (col K = index 10) and tracking (col L = index 11)
    const updatedRow = [...row];
    updatedRow[ORDER_COLS.STATUS] = status;
    updatedRow[11] = (tracking || '').toString().trim(); // col L = tracking

    await updateRow(SHEET_NAMES.ORDERS, rowIndex, updatedRow);
    cache.invalidate(CACHE_KEY);

    res.json({ message: 'Order status updated', status, tracking: tracking || '' });
  } catch (err) {
    console.error('[orders PATCH status]', err.message);
    res.status(500).json({ error: 'Failed to update order status', detail: err.message });
  }
});

module.exports = router;
