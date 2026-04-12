// ─── Google Sheets Client ─────────────────────────────────────────────────────
// Handles all read/write operations against the spreadsheet.
// Uses a service account (credentials.json) for authentication.

const { google } = require('googleapis');
const path = require('path');
const { SPREADSHEET_ID, GOOGLE_CREDENTIALS_PATH } = require('./config');

let _sheetsClient = null;

async function getSheetsClient() {
  if (_sheetsClient) return _sheetsClient;

  const credPath = path.resolve(GOOGLE_CREDENTIALS_PATH);
  const auth = new google.auth.GoogleAuth({
    keyFile: credPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  _sheetsClient = google.sheets({ version: 'v4', auth });
  return _sheetsClient;
}

/**
 * Read all rows from a named sheet tab.
 * @param {string} sheetName
 * @returns {Promise<string[][]>}
 */
async function readSheet(sheetName) {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });
  return response.data.values || [];
}

/**
 * Append one or more rows to the bottom of a named sheet tab.
 * @param {string} sheetName
 * @param {string[][]} rows
 */
async function appendRows(sheetName, rows) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  });
}

/**
 * Overwrite a specific row (1-indexed, includes header).
 * @param {string} sheetName
 * @param {number} rowIndex  1-indexed row number
 * @param {string[]} rowData
 */
async function updateRow(sheetName, rowIndex, rowData) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [rowData] },
  });
}

/**
 * Update a single cell in a sheet.
 * @param {string} sheetName
 * @param {number} rowIndex   1-indexed row number
 * @param {number} colIndex   0-indexed column number
 * @param {string} value
 */
async function updateCell(sheetName, rowIndex, colIndex, value) {
  const sheets = await getSheetsClient();
  // Convert 0-indexed col to A1 letter notation
  const colLetter = String.fromCharCode(65 + colIndex);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!${colLetter}${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[value]] },
  });
}

module.exports = { readSheet, appendRows, updateRow, updateCell };
