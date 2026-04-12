# Westwood Finance

Finance management web app for **Westwood Robotics**. Built with SvelteKit (frontend) and Node.js + Express (backend), using Google Sheets as the primary database.

---

## Project Structure

```
westwood-finance/
├── backend/          # Node.js + Express API
│   ├── src/
│   │   ├── config.js          # Central config (categories, sheet names, env)
│   │   ├── sheetsClient.js    # Google Sheets read/write/append
│   │   ├── cache.js           # TTL cache (30s default)
│   │   └── routes/
│   │       ├── expenses.js    # GET + POST /api/expenses
│   │       ├── stats.js       # GET /api/stats
│   │       └── funding.js     # GET + POST /api/funding/*
│   └── .env                   # (gitignored) your secrets
│
└── frontend/         # SvelteKit app
    ├── src/
    │   ├── lib/
    │   │   ├── api.js              # Fetch wrapper
    │   │   ├── utils.js            # Formatting helpers + constants
    │   │   ├── stores/             # Svelte writable stores
    │   │   └── components/         # Reusable UI components
    │   └── routes/
    │       ├── +layout.svelte      # Sidebar + app shell
    │       ├── +page.svelte        # Dashboard
    │       ├── expenses/           # Table view + filters + export
    │       ├── add/                # Add expense form
    │       ├── stats/              # Charts + analytics
    │       └── funding/            # Fundraising / Sponsors / Grants
    └── .env                        # VITE_API_URL
```

---

## Setup Guide

### 1. Google Sheets Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable the **Google Sheets API**
4. Go to **IAM & Admin → Service Accounts**, create a service account
5. Create a key (JSON format) and download it
6. Rename it to `credentials.json` and place it in `backend/`
7. **Share your Google Sheet** with the service account email (Editor access)

### 2. Set Up Environment Variables

Copy the template:
```bash
# backend/.env is already created — fill in your values:
SPREADSHEET_ID=1AbCdEfGhIjKlMnOpQ...   # from your sheet URL
GOOGLE_CREDENTIALS_PATH=./credentials.json
```

### 3. Google Sheets Structure

**Expenses tab** (must be named `Expenses`):
| A: Item | B: Company | C: Link | D: Price | E: Quantity | F: Notes | G: Category | H: User | I: Timestamp | J: Total |

- First row should be headers (will be auto-skipped)
- Last row can be a GRAND TOTAL row (auto-filtered out)
- Category must be: `hardware`, `software`, `outreach`, or `miscellaneous`

**Funding tab** (must be named `Fundraising`):
| A: Type | B: Name | C: Amount | D: Date | E: Notes | F: Status | G: Organization | H: ContributionType | I: Deadline |

- First row should be headers
- Type values: `fundraising`, `sponsor`, or `grant`

### 4. Run the Backend

```bash
cd backend
npm install       # already done
npm run dev       # runs on http://localhost:3001
```

> If `npm` isn't on your PATH: `node /usr/local/lib/node_modules/npm/bin/npm-cli.js run dev`

### 5. Run the Frontend

```bash
cd frontend
npm run dev       # runs on http://localhost:5173
```

---

## API Reference

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/expenses` | All expenses (cached 30s) |
| GET | `/api/expenses?sync=true` | Force refresh from sheet |
| POST | `/api/expenses` | Add a new expense |
| GET | `/api/stats` | Computed analytics |
| GET | `/api/funding` | All funding data |
| POST | `/api/funding/fundraising` | Add fundraising entry |
| POST | `/api/funding/sponsor` | Add sponsor |
| POST | `/api/funding/grant` | Add grant application |
| GET | `/api/health` | Server health check |

### POST /api/expenses body
```json
{
  "item": "REV Hub",
  "company": "REV Robotics",
  "link": "https://revrobotics.com/...",
  "price": 34.99,
  "quantity": 2,
  "notes": "For drive train",
  "user": "Ishaan",
  "category": "hardware"
}
```

---

## Configuration

All tuneable values are in `backend/src/config.js`:
- `CATEGORIES` — valid expense categories
- `GRANT_STATUSES` — valid grant statuses
- `SEASON_BUDGET` — optional budget cap (set via env `SEASON_BUDGET=5000`)
- `CACHE_TTL_MS` — cache duration
- `SHEET_NAMES` — Expenses and Funding tab names

---

## Security Notes

- `credentials.json` is in `.gitignore` — **never commit it**
- Use environment variables for all secrets
- The service account only has access to the specific spreadsheet you share it with
