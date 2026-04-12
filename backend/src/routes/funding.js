// ─── Funding Routes (Fundraising, Sponsors, Grants) ──────────────────────────
// All three sections share the same Google Sheet tab but use a Type column
// to discriminate between row kinds.

const express = require('express');
const router = express.Router();
const { readSheet, appendRows } = require('../sheetsClient');
const cache = require('../cache');
const {
  SHEET_NAMES, FUNDING_COLS, FUNDING_TYPES,
  CONTRIBUTION_TYPES, GRANT_STATUSES
} = require('../config');

const CACHE_KEY = 'funding';

// ── Helpers ───────────────────────────────────────────────────────────────────
function safeGet(row, idx) { return (row[idx] || '').toString().trim(); }
function safeNum(v) { return parseFloat(v) || 0; }

function parseAllFunding(rows) {
  if (!rows || rows.length === 0) return { fundraising: [], sponsors: [], grants: [] };

  const startIndex = (rows[0][0] || '').toLowerCase() === 'type' ? 1 : 0;
  const result = { fundraising: [], sponsors: [], grants: [] };

  rows.slice(startIndex).forEach((row, i) => {
    const type = safeGet(row, FUNDING_COLS.TYPE).toLowerCase();
    const base = {
      id:     startIndex + i + 1,
      name:   safeGet(row, FUNDING_COLS.NAME),
      amount: safeNum(safeGet(row, FUNDING_COLS.AMOUNT)),
      date:   safeGet(row, FUNDING_COLS.DATE),
      notes:  safeGet(row, FUNDING_COLS.NOTES),
    };

    if (type === FUNDING_TYPES.FUNDRAISING) {
      result.fundraising.push(base);
    } else if (type === FUNDING_TYPES.SPONSOR) {
      result.sponsors.push({ ...base, contributionType: safeGet(row, FUNDING_COLS.CONTRIBUTION_TYPE) });
    } else if (type === FUNDING_TYPES.GRANT) {
      result.grants.push({
        ...base,
        status:       safeGet(row, FUNDING_COLS.STATUS),
        organization: safeGet(row, FUNDING_COLS.ORGANIZATION),
        deadline:     safeGet(row, FUNDING_COLS.DEADLINE),
      });
    }
  });

  return result;
}

// ── GET /api/funding ───────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    if (req.query.sync === 'true') cache.invalidate(CACHE_KEY);
    const cached = cache.get(CACHE_KEY);
    if (cached) return res.json(cached);

    const rows = await readSheet(SHEET_NAMES.FUNDING);
    const data = parseAllFunding(rows);
    cache.set(CACHE_KEY, data);
    res.json(data);
  } catch (err) {
    console.error('[funding GET]', err.message);
    res.status(500).json({ error: 'Failed to fetch funding data', detail: err.message });
  }
});

// ── POST /api/funding/fundraising ──────────────────────────────────────────────
router.post('/fundraising', async (req, res) => {
  try {
    const { name, amount, date, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Source name is required' });
    if (isNaN(parseFloat(amount))) return res.status(400).json({ error: 'Invalid amount' });

    const row = [
      FUNDING_TYPES.FUNDRAISING,
      name.trim(),
      parseFloat(amount).toFixed(2),
      date || new Date().toISOString().slice(0, 10),
      (notes || '').trim(),
      '', '', '', '',
    ];
    await appendRows(SHEET_NAMES.FUNDING, [row]);
    cache.invalidate(CACHE_KEY);
    res.status(201).json({ message: 'Fundraising entry added' });
  } catch (err) {
    console.error('[funding/fundraising POST]', err.message);
    res.status(500).json({ error: 'Failed to save fundraising entry', detail: err.message });
  }
});

// ── POST /api/funding/sponsor ──────────────────────────────────────────────────
router.post('/sponsor', async (req, res) => {
  try {
    const { name, amount, date, notes, contributionType } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Sponsor name is required' });
    if (!CONTRIBUTION_TYPES.includes(contributionType))
      return res.status(400).json({ error: `contributionType must be: ${CONTRIBUTION_TYPES.join(', ')}` });

    const row = [
      FUNDING_TYPES.SPONSOR,
      name.trim(),
      parseFloat(amount || 0).toFixed(2),
      date || new Date().toISOString().slice(0, 10),
      (notes || '').trim(),
      '',
      '',
      contributionType,
      '',
    ];
    await appendRows(SHEET_NAMES.FUNDING, [row]);
    cache.invalidate(CACHE_KEY);
    res.status(201).json({ message: 'Sponsor added' });
  } catch (err) {
    console.error('[funding/sponsor POST]', err.message);
    res.status(500).json({ error: 'Failed to save sponsor', detail: err.message });
  }
});

// ── POST /api/funding/grant ────────────────────────────────────────────────────
router.post('/grant', async (req, res) => {
  try {
    const { name, organization, amount, status, deadline, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Grant name is required' });
    if (!GRANT_STATUSES.includes(status))
      return res.status(400).json({ error: `Status must be: ${GRANT_STATUSES.join(', ')}` });

    const row = [
      FUNDING_TYPES.GRANT,
      name.trim(),
      parseFloat(amount || 0).toFixed(2),
      new Date().toISOString().slice(0, 10),
      (notes || '').trim(),
      status,
      (organization || '').trim(),
      '',
      (deadline || '').trim(),
    ];
    await appendRows(SHEET_NAMES.FUNDING, [row]);
    cache.invalidate(CACHE_KEY);
    res.status(201).json({ message: 'Grant added' });
  } catch (err) {
    console.error('[funding/grant POST]', err.message);
    res.status(500).json({ error: 'Failed to save grant', detail: err.message });
  }
});

module.exports = router;
