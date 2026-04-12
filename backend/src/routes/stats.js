// ─── Stats Routes (Local DB) ───────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { SEASON_BUDGET, SHEET_NAMES } = require('../config');
const { readSheet } = require('../sheetsClient');

router.get('/', async (req, res) => {
  try {
    const rows = await readSheet(SHEET_NAMES.EXPENSES);
    if (!rows || rows.length === 0) {
      return res.json({ totalSpent: 0, totalItems: 0, avgCost: 0, byCategory: {}, topVendor: null, mostExpensive: null, seasonBudget: SEASON_BUDGET, budgetRemaining: SEASON_BUDGET });
    }

    const startIndex = (rows[0][0] || '').toLowerCase() === 'item' ? 1 : 0;
    const expenses = rows.slice(startIndex).map(r => ({
      item: r[0], company: r[1], category: r[6], total: parseFloat(r[9]) || 0
    })).filter(e => e.item);

    let totalSpent = 0;
    const byCategory = {};
    const vendorCounts = {};
    let mostExpensive = null;

    expenses.forEach((exp) => {
      totalSpent += exp.total;
      byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.total;
      const co = exp.company || 'Unknown';
      vendorCounts[co] = (vendorCounts[co] || 0) + 1;
      if (!mostExpensive || exp.total > mostExpensive.total) mostExpensive = exp;
    });

    let topVendor = null;
    let maxOrders = 0;
    for (const [co, count] of Object.entries(vendorCounts)) {
      if (count > maxOrders && co !== 'Unknown') {
        maxOrders = count;
        topVendor = { company: co, count };
      }
    }

    res.json({
      totalSpent,
      totalItems: expenses.length,
      avgCost: expenses.length > 0 ? totalSpent / expenses.length : 0,
      byCategory,
      topVendor,
      mostExpensive,
      seasonBudget: SEASON_BUDGET,
      budgetRemaining: SEASON_BUDGET !== null ? SEASON_BUDGET - totalSpent : null,
    });
  } catch (err) {
    console.error('[stats GET]', err.message);
    res.status(500).json({ error: 'Failed to compute stats from Sheets', detail: err.message });
  }
});

module.exports = router;
