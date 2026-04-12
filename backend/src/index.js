// ─── Express App Entry Point ──────────────────────────────────────────────────
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PORT } = require('./config');

const expensesRouter = require('./routes/expenses');
const statsRouter    = require('./routes/stats');
const fundingRouter  = require('./routes/funding');

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use('/api/expenses', expensesRouter);
app.use('/api/stats',    statsRouter);
app.use('/api/funding',  fundingRouter);

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── 404 fallback ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Error handler ──────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`✅  Westwood Finance API running on http://localhost:${PORT}`);
  console.log(`    Health: http://localhost:${PORT}/api/health`);
});

module.exports = app;
