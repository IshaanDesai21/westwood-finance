// ─── Stats Routes (Local DB) ───────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const db = require('../db');
const { SEASON_BUDGET } = require('../config');

router.get('/', (req, res) => {
  try {
    const expenses = db.prepare('SELECT * FROM expenses').all();

    let totalSpent = 0;
    const byCategory = {};
    const vendorCounts = {};
    let mostExpensive = null;

    expenses.forEach((exp) => {
      totalSpent += exp.total;

      // Category breakdown
      byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.total;

      // Vendor tracking
      const co = exp.company || 'Unknown';
      vendorCounts[co] = (vendorCounts[co] || 0) + 1;

      // Most expensive item tracking
      if (!mostExpensive || exp.total > mostExpensive.total) {
        mostExpensive = exp;
      }
    });

    // Determine top vendor
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
      // Pass budget cap info if configured
      seasonBudget: SEASON_BUDGET,
      budgetRemaining: SEASON_BUDGET !== null ? SEASON_BUDGET - totalSpent : null,
    });
  } catch (err) {
    console.error('[stats GET]', err.message);
    res.status(500).json({ error: 'Failed to compute stats', detail: err.message });
  }
});

module.exports = router;
