// ─── Central Configuration ────────────────────────────────────────────────────
// All runtime-configurable values live here. Edit this file to adapt the app.

require('dotenv').config();

// Valid expense categories — must match your sheet & frontend dropdowns
const CATEGORIES = ['hardware', 'software', 'outreach', 'miscellaneous'];

// Contribution types for sponsors
const CONTRIBUTION_TYPES = ['money', 'parts', 'services'];

// Grant statuses
const GRANT_STATUSES = ['Applied', 'Pending', 'Awarded', 'Rejected'];

// Funding row types (used as the Type discriminator column in the Fundraising tab)
const FUNDING_TYPES = {
  FUNDRAISING: 'fundraising',
  SPONSOR: 'sponsor',
  GRANT: 'grant',
  CLUB_DUES: 'club_dues',
};

// Google Sheets tab names
const SHEET_NAMES = {
  ORDERS: process.env.ORDERS_SHEET_NAME || 'Part Orders', // Formerly Expenses
  FUNDING: process.env.FUNDING_SHEET_NAME  || 'Fundraising',
};

// Column indices (0-based) for the Orders sheet: A→0, B→1, …, J→9
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
};

// Column indices for the Funding sheet
const FUNDING_COLS = {
  TYPE:              0,  // fundraising | sponsor | grant
  NAME:              1,  // source name / sponsor name / grant name
  AMOUNT:            2,
  DATE:              3,
  NOTES:             4,
  STATUS:            5,  // used by grants
  ORGANIZATION:      6,  // used by grants
  CONTRIBUTION_TYPE: 7,  // used by sponsors
  DEADLINE:          8,  // used by grants
};

// Optional season budget cap (set to null to hide the budget bar)
const SEASON_BUDGET = process.env.SEASON_BUDGET ? Number(process.env.SEASON_BUDGET) : null;

// Cache TTL in milliseconds
const CACHE_TTL_MS = (Number(process.env.CACHE_TTL_SECONDS) || 30) * 1000;

module.exports = {
  SPREADSHEET_ID: process.env.SPREADSHEET_ID,
  GOOGLE_CREDENTIALS_PATH: process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json',
  PORT: Number(process.env.PORT) || 3001,
  CATEGORIES,
  CONTRIBUTION_TYPES,
  GRANT_STATUSES,
  FUNDING_TYPES,
  SHEET_NAMES,
  ORDER_COLS,
  FUNDING_COLS,
  SEASON_BUDGET,
  CACHE_TTL_MS,
};
