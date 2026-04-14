<script>
  import { onMount } from "svelte";
  import { formatCurrency, getTeamBadgeClass } from "$lib/utils.js";
  import CustomDropdown from "$lib/components/CustomDropdown.svelte";
  import LoadingIndicator from "$lib/components/LoadingIndicator.svelte";

  // ── API Config ──────────────────────────────────────────────────────────────
  const BASE_URL =
    "https://script.google.com/macros/s/AKfycbxc8jeXwQ9FyFWIdhGmPZ7I674wt8wyjFkG1fdp0CP_AwLEJYXMdJcVgxAwu0YRQl3adA/exec";
  const SECRET_KEY = "YOUR_SECRET_KEY";

  const FUND_TYPES = ["Fundraiser", "Grant", "Dues", "Sponsor", "Other"];
  const RECIPIENTS = [
    "All",
    "Slingshot",
    "Atlatl",
    "Kunai",
    "Hunga Munga",
    "FRC",
    "WWROBO",
  ];

  // ── State ───────────────────────────────────────────────────────────────────
  /** @type {any[]} */
  let funds = $state([]);
  /** @type {Record<string, any> | null} */
  let budget = $state(null);
  let loadingFunds = $state(false);
  let loadingBudget = $state(false);
  let fundsError = $state(/** @type {string|null} */ (null));
  let budgetError = $state(/** @type {string|null} */ (null));

  let activeTab = $state("overview");
  let sortCol = $state("Date");
  let sortDir = $state("desc");

  let form = $state({
    type: "Fundraiser",
    source: "",
    amount: "",
    date: "",
    notes: "",
    recipient: "All",
  });
  let submitting = $state(false);
  let formMsg = $state("");
  let formErr = $state("");

  // ── Lock ─────────────────────────────────────────────────────────────────────
  let unlocked = $state(false);
  let passwordInput = $state("");
  let authError = $state("");

  function tryUnlock() {
    if (passwordInput === "/dev3432") {
      unlocked = true;
      authError = "";
      passwordInput = "";
    } else {
      authError = "Incorrect password. Please try again.";
      passwordInput = "";
    }
  }

  // ── Data Loading ─────────────────────────────────────────────────────────────
  async function loadFunds() {
    loadingFunds = true;
    fundsError = null;
    try {
      const res = await fetch(`${BASE_URL}?action=getFunds&key=${SECRET_KEY}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      funds = await res.json();
    } catch (e) {
      fundsError = e instanceof Error ? e.message : "Unknown error";
    } finally {
      loadingFunds = false;
    }
  }

  async function loadBudget() {
    loadingBudget = true;
    budgetError = null;
    try {
      const res = await fetch(`${BASE_URL}?action=getBudget&key=${SECRET_KEY}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      budget = await res.json();
    } catch (e) {
      budgetError = e instanceof Error ? e.message : "Unknown error";
    } finally {
      loadingBudget = false;
    }
  }

  onMount(() => {
    loadFunds();
    loadBudget();
  });

  // ── Derived totals ──────────────────────────────────────────────────────────
  let totalRaised = $derived(
    funds.reduce((sum, f) => sum + (Number(f.Amount) || 0), 0),
  );

  let byType = $derived(() => {
    /** @type {Record<string, number>} */
    const map = {};
    for (const f of funds) {
      const t = f.Type || "Other";
      map[t] = (map[t] || 0) + (Number(f.Amount) || 0);
    }
    return map;
  });

  let budgetTeams = $derived(
    budget ? Object.entries(budget).filter(([key]) => key !== "Total") : [],
  );
  let budgetTotal = $derived(/** @type {any} */ (budget)?.Total ?? null);

  let sortedFunds = $derived(
    funds.slice().sort((a, b) => {
      let valA = a[sortCol] || "";
      let valB = b[sortCol] || "";
      if (sortCol === "Amount") {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      }
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    })
  );

  function toggleSort(/** @type {string} */ col) {
    if (sortCol === col) {
      sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      sortCol = col;
      sortDir = col === "Date" || col === "Amount" ? "desc" : "asc";
    }
  }

  // ── Add Funds ───────────────────────────────────────────────────────────────
  async function addFunds() {
    formErr = "";
    formMsg = "";
    if (!form.source.trim()) {
      formErr = "Source is required.";
      return;
    }
    if (!form.amount || isNaN(Number(form.amount))) {
      formErr = "A valid amount is required.";
      return;
    }

    submitting = true;
    try {
      const params = new URLSearchParams({
        action: "addFundraising",
        key: SECRET_KEY,
        type: form.type,
        source: form.source,
        amount: form.amount,
        date: form.date,
        notes: form.notes,
        recipient: form.recipient,
      });
      const res = await fetch(`${BASE_URL}?${params.toString()}`);
      const result = await res.json();
      if (!res.ok || result?.error)
        throw new Error(result?.error || "Request failed");

      formMsg = "✓ Funding entry added!";
      form = {
        type: "Fundraiser",
        source: "",
        amount: "",
        date: "",
        notes: "",
        recipient: "All",
      };
      await loadFunds();
      await loadBudget();
    } catch (e) {
      formErr = e instanceof Error ? e.message : "Unknown error";
    } finally {
      submitting = false;
    }
  }

  // ── Formatting helpers ──────────────────────────────────────────────────────
  function formatDate(/** @type {string} */ ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  const TYPE_COLORS = /** @type {Record<string,string>} */ ({
    Fundraiser: "var(--primary)",
    Grant: "#b97cf3",
    Dues: "#4e9af1",
    Sponsor: "#6bcb77",
    Other: "#f1a94e",
  });
</script>

<svelte:head>
  <title>Funding — Westwood Finance</title>
</svelte:head>

<div class="page-header">
  <h1>Funding <span>& Budget</span></h1>
  <div style="display:flex;gap:8px;">
    <button
      class="btn btn-ghost btn-sm"
      onclick={() => {
        loadFunds();
        loadBudget();
      }}
    >
      <span class:spinning={loadingFunds || loadingBudget}>↻</span> Refresh
    </button>
  </div>
</div>

<!-- ── Tab Nav ──────────────────────────────────────────────────────────────── -->
<div class="tabs-container">
  <div class="segmented-control" style="position:relative; z-index:0;">
    <div class="segment-highlight" style="transform: translateX(calc({['overview', 'history', 'budget', 'add'].indexOf(activeTab)} * 100%));"></div>
    {#each [["overview", "Overview"], ["history", "Funding History"], ["budget", "Team Budgets"], ["add", "+ Add Funds"]] as [key, label]}
      <button
        class="segment"
        class:active={activeTab === key}
        onclick={() => (activeTab = key)}
        id="tab-{key}">{label}</button
      >
    {/each}
  </div>
</div>

{#if fundsError}
  <div class="error-bar">⚠ Funds: {fundsError}</div>
{/if}
{#if budgetError}
  <div class="error-bar">⚠ Budget: {budgetError}</div>
{/if}

<!-- ══ OVERVIEW ══════════════════════════════════════════════════════════════ -->
{#if activeTab === "overview"}
  <!-- Summary strip -->
  <div class="stat-grid fade-in">
    <div class="card">
      <div class="card-title">Total Raised</div>
      <div class="stat-value" style="color:#6bcb77">
        {formatCurrency(totalRaised)}
      </div>
      <div class="stat-sub">{funds.length} entries</div>
    </div>

    {#if budgetTotal}
      <div class="card">
        <div class="card-title">Total Club Funds</div>
        <div class="stat-value" style="color:var(--primary)">
          {formatCurrency(budgetTotal["Club Funds"] || 0)}
        </div>
      </div>
      <div class="card">
        <div class="card-title">Personal Funds</div>
        <div class="stat-value" style="color:#4e9af1">
          {formatCurrency(budgetTotal["Personal Funds"] || 0)}
        </div>
      </div>
      <div class="card">
        <div class="card-title">Total Expenses</div>
        <div class="stat-value" style="color:#f16a4e">
          {formatCurrency(Math.abs(budgetTotal["Expenses"] || 0))}
        </div>
      </div>
      <div class="card" style="border-color:var(--primary)">
        <div class="card-title">Net Balance</div>
        <div
          class="stat-value"
          style="color:{(budgetTotal['Final'] || 0) >= 0
            ? '#6bcb77'
            : '#f16a4e'}"
        >
          {formatCurrency(budgetTotal["Final"] || 0)}
        </div>
      </div>
    {/if}
  </div>

  <!-- Type breakdown -->
  <div class="section-title" style="margin-top:28px">Funding by Type</div>
  {#if loadingFunds}
    <LoadingIndicator />
  {:else}
    <div class="type-breakdown card">
      {#each FUND_TYPES as type}
        {@const amount = byType()[type] || 0}
        {@const pct = totalRaised > 0 ? (amount / totalRaised) * 100 : 0}
        {@const color = TYPE_COLORS[type] || "#8a8a8a"}
        <div class="breakdown-row">
          <div class="breakdown-meta">
            <span class="breakdown-label" style="color:{color}">{type}</span>
            <span class="breakdown-amount">{formatCurrency(amount)}</span>
          </div>
          <div class="breakdown-bar-track">
            <div
              class="breakdown-bar-fill"
              style="width:{pct}%;background:{color}"
            ></div>
          </div>
          <span class="breakdown-pct text-muted">{pct.toFixed(0)}%</span>
        </div>
      {/each}
    </div>
  {/if}

  <!-- ══ HISTORY ══════════════════════════════════════════════════════════════ -->
{:else if activeTab === "history"}
  {#if loadingFunds}
    <LoadingIndicator />
  {:else if funds.length === 0}
    <div class="empty-state card">
      <div class="icon">💰</div>
      No funding entries yet.
    </div>
  {:else}
    <div class="card fade-in" style="padding:0;overflow:hidden">
      <table>
        <thead>
          <tr>
            <th class="sortable" onclick={() => toggleSort("Type")}>Type {sortCol === "Type" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
            <th class="sortable" onclick={() => toggleSort("Source")}>Source {sortCol === "Source" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
            <th class="sortable" onclick={() => toggleSort("Recipient")}>Recipient {sortCol === "Recipient" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
            <th class="sortable" onclick={() => toggleSort("Date")}>Date {sortCol === "Date" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
            <th class="sortable" onclick={() => toggleSort("Notes")}>Notes {sortCol === "Notes" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
            <th class="sortable text-right" onclick={() => toggleSort("Amount")}>Amount {sortCol === "Amount" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
          </tr>
        </thead>
        <tbody>
          {#each sortedFunds as entry}
            <tr class="fade-in">
              <td>
                <span
                  class="type-badge"
                  style="color:{TYPE_COLORS[entry.Type] || 'var(--text-muted)'}"
                >
                  {entry.Type || "—"}
                </span>
              </td>
              <td style="font-weight:500">{entry.Source || "—"}</td>
              <td>
                {#if entry.Recipient && entry.Recipient !== 'All'}
                  <span class="badge {getTeamBadgeClass(entry.Recipient)}">{entry.Recipient}</span>
                {:else}
                  <span class="recipient-chip">{entry.Recipient || "—"}</span>
                {/if}
              </td>
              <td class="text-muted">{formatDate(entry.Date)}</td>
              <td class="text-muted" style="font-size:0.82rem"
                >{entry.Notes || "—"}</td
              >
              <td
                class="text-right monospace"
                style="font-weight:600;color:#6bcb77"
              >
                {formatCurrency(Number(entry.Amount) || 0)}
              </td>
            </tr>
          {/each}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="5" style="padding-top:20px; padding-bottom:20px; font-size:1rem;"><strong>Total</strong></td>
            <td class="text-right monospace" style="color:#6bcb77; padding-top:20px; padding-bottom:20px; font-size:1.1rem;"
              ><strong>{formatCurrency(totalRaised)}</strong></td
            >
          </tr>
        </tfoot>
      </table>
    </div>
  {/if}

  <!-- ══ TEAM BUDGETS ═════════════════════════════════════════════════════════ -->
{:else if activeTab === "budget"}
  {#if loadingBudget}
    <LoadingIndicator />
  {:else if !budget}
    <div class="empty-state card">
      <div class="icon">📊</div>
      No budget data available.
    </div>
  {:else}
    <div class="budget-grid fade-in">
      {#each budgetTeams as [team, data]}
        {@const final = data["Final"] ?? 0}
        {@const clubFunds = data["Club Funds"] ?? 0}
        {@const expenses = data["Expenses"] ?? 0}
        {@const personal = data["Personal Funds"] ?? 0}
        {@const pct =
          budgetTotal && budgetTotal["Final"] > 0
            ? Math.min(100, (final / budgetTotal["Final"]) * 100)
            : 0}
        <div class="budget-card card">
          <div class="budget-team-name">{team}</div>
          <div
            class="budget-final"
            style="color:{final >= 0 ? '#6bcb77' : '#f16a4e'}"
          >
            {formatCurrency(final)}
          </div>
          <div class="budget-details">
            <div class="budget-detail-row">
              <span class="text-muted">Club Funds</span>
              <span class="monospace">{formatCurrency(clubFunds)}</span>
            </div>
            <div class="budget-detail-row">
              <span class="text-muted">Personal</span>
              <span class="monospace" style="color:#4e9af1"
                >{formatCurrency(personal)}</span
              >
            </div>
            <div class="budget-detail-row">
              <span class="text-muted">Expenses</span>
              <span class="monospace" style="color:#f16a4e"
                >{formatCurrency(Math.abs(expenses))}</span
              >
            </div>
          </div>
          <div class="budget-bar-track" style="margin-top:12px">
            <div
              class="budget-bar-fill"
              style="width:{pct}%;background:var(--primary)"
            ></div>
          </div>
        </div>
      {/each}
    </div>

    <!-- Totals summary -->
    {#if budgetTotal}
      <div class="card totals-card fade-in">
        <div class="card-title" style="font-size:1rem;margin-bottom:16px">
          Overall Totals
        </div>
        <div class="totals-grid">
          <div>
            <div class="text-muted" style="font-size:0.8rem">Club Funds</div>
            <div class="monospace" style="font-size:1.2rem;font-weight:700">
              {formatCurrency(budgetTotal["Club Funds"] || 0)}
            </div>
          </div>
          <div>
            <div class="text-muted" style="font-size:0.8rem">Personal</div>
            <div
              class="monospace"
              style="font-size:1.2rem;font-weight:700;color:#4e9af1"
            >
              {formatCurrency(budgetTotal["Personal Funds"] || 0)}
            </div>
          </div>
          <div>
            <div class="text-muted" style="font-size:0.8rem">Expenses</div>
            <div
              class="monospace"
              style="font-size:1.2rem;font-weight:700;color:#f16a4e"
            >
              {formatCurrency(Math.abs(budgetTotal["Expenses"] || 0))}
            </div>
          </div>
          <div>
            <div class="text-muted" style="font-size:0.8rem">Net Final</div>
            <div
              class="monospace"
              style="font-size:1.4rem;font-weight:700;color:{budgetTotal[
                'Final'
              ] >= 0
                ? '#6bcb77'
                : '#f16a4e'}"
            >
              {formatCurrency(budgetTotal["Final"] || 0)}
            </div>
          </div>
        </div>
      </div>
    {/if}
  {/if}

  <!-- ══ ADD FUNDS ════════════════════════════════════════════════════════════ -->
{:else if activeTab === "add"}
  {#if !unlocked}
    <!-- Lock Screen -->
    <div class="lock-screen">
      <div class="lock-card card">
        <div class="lock-icon">🔐</div>
        <h2>Add Funds Access</h2>
        <p class="text-muted" style="margin-bottom:24px;font-size:0.9rem">
          Enter the password to add a funding entry.
        </p>
        {#if authError}
          <div class="error-bar" style="margin-bottom:16px">{authError}</div>
        {/if}
        <form
          onsubmit={(e) => {
            e.preventDefault();
            tryUnlock();
          }}
          id="fund-lock-form"
        >
          <div class="form-group" style="margin-bottom:16px">
            <label for="fund-password">Password</label>
            <input
              id="fund-password"
              type="password"
              bind:value={passwordInput}
              placeholder="Enter password"
              autocomplete="current-password"
            />
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%"
            >Unlock</button
          >
        </form>
      </div>
    </div>
  {:else}
    <div class="unlocked-header">
      <span class="unlocked-badge">🔓 Unlocked</span>
      <button class="btn btn-ghost btn-sm" onclick={() => (unlocked = false)}
        >Lock</button
      >
    </div>
    <div class="add-layout fade-in">
      <div class="card add-card">
        <h3 style="margin-bottom:20px">Add Funding Entry</h3>

        {#if formErr}
          <div class="error-bar">{formErr}</div>
        {/if}
        {#if formMsg}
          <div class="success-bar">{formMsg}</div>
        {/if}

        <form
          onsubmit={(e) => {
            e.preventDefault();
            addFunds();
          }}
          id="add-funds-form"
        >
          <div class="form-grid">
            <div class="form-group">
              <label for="f-type">Type *</label>
              <select id="f-type" bind:value={form.type} required>
                {#each FUND_TYPES as t}
                  <option value={t}>{t}</option>
                {/each}
              </select>
            </div>

            <div class="form-group">
              <label for="f-recipient">Recipient *</label>
              <select id="f-recipient" bind:value={form.recipient} required>
                {#each RECIPIENTS as r}
                  <option value={r}>{r}</option>
                {/each}
              </select>
            </div>

            <div class="form-group" style="grid-column:1/-1">
              <label for="f-source">Source / Description *</label>
              <input
                id="f-source"
                type="text"
                bind:value={form.source}
                placeholder="e.g. Bake Sale, WW Special Team Grant…"
                required
              />
            </div>

            <div class="form-group">
              <label for="f-amount">Amount ($) *</label>
              <input
                id="f-amount"
                type="number"
                bind:value={form.amount}
                min="0"
                step="0.01"
                placeholder="0.00"
                required
              />
            </div>

            <div class="form-group">
              <label for="f-date">Date</label>
              <input id="f-date" type="date" bind:value={form.date} />
            </div>

            <div class="form-group" style="grid-column:1/-1">
              <label for="f-notes">Notes</label>
              <textarea
                id="f-notes"
                bind:value={form.notes}
                rows="3"
                placeholder="Any additional context…"
              ></textarea>
            </div>
          </div>

          <button
            type="submit"
            class="btn btn-primary"
            style="margin-top:16px"
            disabled={submitting}
          >
            {submitting ? "Saving…" : "+ Add Entry"}
          </button>
        </form>
      </div>

      <aside class="tips-card card">
        <div class="card-title">Tips</div>
        <ul class="tips-list">
          <li>
            Use <strong>All</strong> as recipient for club-wide income that gets distributed
            equally.
          </li>
          <li>
            <strong>Grants</strong> and <strong>Sponsors</strong> go to specific teams
            or WWROBO.
          </li>
          <li>The date field is optional but recommended for tracking.</li>
          <li>Entries appear in Funding History after submission.</li>
        </ul>

        <div style="margin-top:20px">
          <div class="card-title">Fund Types</div>
          <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">
            {#each FUND_TYPES as t}
              <span
                class="type-tag"
                style="border-left:3px solid {TYPE_COLORS[t] || '#8a8a8a'}"
              >
                {t}
              </span>
            {/each}
          </div>
        </div>
      </aside>
    </div>
  {/if}
{/if}

<style>
  /* ── Lock Screen ──────────────────────────────────────────────────────────── */
  .lock-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
  }
  .lock-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 48px 40px;
    width: 100%;
    max-width: 400px;
    text-align: center;
    box-shadow: var(--shadow-lg);
  }
  .lock-icon {
    font-size: 3rem;
    margin-bottom: 16px;
  }
  .lock-card h2 {
    margin-bottom: 8px;
  }
  .unlocked-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
  }
  .unlocked-badge {
    font-size: 0.8rem;
    font-weight: 600;
    color: #6bcb77;
    background: rgba(107, 203, 119, 0.12);
    border: 1px solid rgba(107, 203, 119, 0.3);
    padding: 4px 10px;
    border-radius: 999px;
  }

  /* ── Tabs ──────────────────────────────────────────────────────────────────── */
  .tabs-container {
    display: flex;
    justify-content: center;
    margin-bottom: 24px;
  }
  .segmented-control {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    background: var(--surface-2);
    padding: 4px;
    border-radius: 99px;
    border: 1px solid var(--border);
    position: relative;
    gap: 0;
  }
  .segment-highlight {
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: 4px;
    width: calc((100% - 8px) / 4);
    background: var(--surface);
    border-radius: 99px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    z-index: 1;
  }
  .segment {
    position: relative;
    z-index: 2;
    background: transparent;
    border: none;
    padding: 8px 18px;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-muted);
    border-radius: 99px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .segment:hover {
    color: var(--text);
  }
  .segment.active {
    color: var(--primary);
  }

  /* ── Overview ─────────────────────────────────────────────────────────────── */
  .stat-value {
    font-size: 1.7rem;
    font-weight: 700;
    margin: 4px 0;
  }
  .stat-sub {
    font-size: 0.78rem;
    color: var(--text-muted);
  }

  .type-breakdown {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 20px;
  }
  .breakdown-row {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    gap: 4px 12px;
    align-items: center;
  }
  .breakdown-meta {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .breakdown-label {
    font-weight: 600;
    font-size: 0.875rem;
  }
  .breakdown-amount {
    font-size: 0.85rem;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }
  .breakdown-bar-track {
    grid-column: 1;
    height: 5px;
    background: var(--surface-2);
    border-radius: 999px;
    overflow: hidden;
  }
  .breakdown-bar-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.4s ease;
  }
  .breakdown-pct {
    grid-column: 2;
    grid-row: 1 / 3;
    font-size: 0.78rem;
    font-weight: 700;
    min-width: 32px;
    text-align: right;
  }

  /* ── History ──────────────────────────────────────────────────────────────── */
  .type-badge {
    font-weight: 700;
    font-size: 0.8rem;
  }
  .recipient-chip {
    font-size: 0.78rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    padding: 2px 8px;
    border-radius: 999px;
    color: var(--text-muted);
  }

  /* ── Team Budgets ─────────────────────────────────────────────────────────── */
  .budget-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 20px;
  }
  .budget-card {
    padding: 20px;
  }
  .budget-team-name {
    font-size: 1rem;
    font-weight: 700;
    margin-bottom: 4px;
    color: var(--text);
  }
  .budget-final {
    font-size: 1.6rem;
    font-weight: 700;
    margin-bottom: 12px;
  }
  .budget-details {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .budget-detail-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.82rem;
  }
  .budget-bar-track {
    height: 4px;
    background: var(--surface-2);
    border-radius: 999px;
    overflow: hidden;
  }
  .budget-bar-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.4s ease;
  }

  .totals-card {
    padding: 20px;
    margin-top: 4px;
    border-color: var(--primary);
  }
  .totals-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 20px;
  }

  /* ── Add Funds ────────────────────────────────────────────────────────────── */
  .add-layout {
    display: grid;
    grid-template-columns: 1fr 240px;
    gap: 24px;
    align-items: start;
  }
  @media (max-width: 900px) {
    .add-layout {
      grid-template-columns: 1fr;
    }
  }
  .add-card {
    padding: 28px;
  }

  .success-bar {
    background: rgba(107, 203, 119, 0.12);
    border: 1px solid rgba(107, 203, 119, 0.3);
    color: #6bcb77;
    padding: 10px 16px;
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
    margin-bottom: 16px;
  }
  .tips-card {
    padding: 20px;
  }
  .tips-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 10px;
  }
  .tips-list li {
    font-size: 0.85rem;
    color: var(--text-muted);
    padding-left: 16px;
    position: relative;
  }
  .tips-list li::before {
    content: "›";
    position: absolute;
    left: 0;
    color: var(--primary);
  }
  .type-tag {
    font-size: 0.82rem;
    font-weight: 600;
    padding: 4px 10px;
    background: var(--surface-2);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
  }
</style>
