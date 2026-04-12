// ─── Express App Entry Point ──────────────────────────────────────────────────
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PORT } = require('./config');

const expensesRouter = require('./routes/expenses');
const ordersRouter   = require('./routes/orders');
const statsRouter    = require('./routes/stats');
const fundingRouter  = require('./routes/funding');

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────────
// Support multiple allowed origins (space-separated in CORS_ORIGIN env var)
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(' ').map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (e.g. curl, Postman, same-origin)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
}));
app.use(express.json());

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use('/api/expenses', expensesRouter);
app.use('/api/orders',   ordersRouter);
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
