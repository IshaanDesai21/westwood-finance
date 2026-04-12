// ─── Central Configuration ────────────────────────────────────────────────────
// All runtime-configurable values live here. Edit this file to adapt the app.

require('dotenv').config();

// Valid expense/order categories — must match your sheet & frontend dropdowns
const CATEGORIES = ['hardware', 'software', 'outreach', 'food', 'miscellaneous'];

// Contribution types for sponsors
const CONTRIBUTION_TYPES = ['money', 'parts', 'services'];

// Grant statuses
const GRANT_STATUSES = ['Applied', 'Pending', 'Awarded', 'Rejected'];

// Order statuses
const ORDER_STATUSES = ['Submitted and in review', 'Ordered', 'Received'];

// Funding row types (used as the Type discriminator column in the Fundraising tab)
const FUNDING_TYPES = {
  FUNDRAISING: 'fundraising',
  SPONSOR:     'sponsor',
  GRANT:       'grant',
  CLUB_DUES:   'club_dues',
  OTHER:       'other',
};

// Google Sheets tab names
const SHEET_NAMES = {
  ORDERS:   process.env.ORDERS_SHEET_NAME   || 'Orders',
  EXPENSES: process.env.EXPENSES_SHEET_NAME || 'Expenses',
  FUNDING:  process.env.FUNDING_SHEET_NAME  || 'Fundraising',
};

// Column indices (0-based) for the Orders sheet: A→0, B→1, …, K→10
const ORDER_COLS = {
  ITEM:      0,
  COMPANY:   1,
  LINK:      2,
  PRICE:     3,
  QUANTITY:  4,
  NOTES:     5,
  CATEGORY:  6,
  USER:      7,
  TIMESTAMP: 8,
  TOTAL:     9,
  STATUS:    10,
};

// Column indices for the Funding sheet
const FUNDING_COLS = {
  TYPE:              0,  // fundraising | sponsor | grant | club_dues | other
  NAME:              1,  // source name / sponsor name / grant name
  AMOUNT:            2,
  DATE:              3,
  NOTES:             4,
  STATUS:            5,  // used by grants
  ORGANIZATION:      6,  // used by grants
  CONTRIBUTION_TYPE: 7,  // used by sponsors
  DEADLINE:          8,  // used by grants
};

// Default category budgets (in dollars) — overridden by DB settings
const DEFAULT_BUDGETS = {
  hardware:      500,
  software:      200,
  outreach:      300,
  food:          150,
  miscellaneous: 100,
};

// Optional season budget cap (set to null to hide the budget bar)
const SEASON_BUDGET = process.env.SEASON_BUDGET ? Number(process.env.SEASON_BUDGET) : null;

// Cache TTL in milliseconds
const CACHE_TTL_MS = (Number(process.env.CACHE_TTL_SECONDS) || 30) * 1000;

// Admin password for protected endpoints
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '/dev3432';

module.exports = {
  SPREADSHEET_ID: process.env.SPREADSHEET_ID,
  GOOGLE_CREDENTIALS_PATH: process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json',
  PORT: Number(process.env.PORT) || 3001,
  CATEGORIES,
  CONTRIBUTION_TYPES,
  GRANT_STATUSES,
  ORDER_STATUSES,
  FUNDING_TYPES,
  SHEET_NAMES,
  ORDER_COLS,
  FUNDING_COLS,
  DEFAULT_BUDGETS,
  SEASON_BUDGET,
  CACHE_TTL_MS,
  ADMIN_PASSWORD,
};
