<script>
  import { onMount } from "svelte";
  import {
    formatCurrency,
    formatFullDate,
    getTeamBadgeClass,
  } from "$lib/utils.js";
  import CustomDropdown from "$lib/components/CustomDropdown.svelte";
  import LoadingIndicator from "$lib/components/LoadingIndicator.svelte";
  import OrderTable from "$lib/components/OrderTable.svelte";
  import { dataService } from "$lib/dataService.svelte.js";
  import { BASE_URL, SECRET_KEY } from "$lib/config.js";
  import AdminLock from "$lib/components/AdminLock.svelte";

  const typeOptions = [
    { label: "Fundraiser", value: "Fundraiser" },
    { label: "Grant", value: "Grant" },
    { label: "Dues", value: "Dues" },
    { label: "Sponsor", value: "Sponsor" },
    { label: "Other", value: "Other" },
  ];
  const recipientOptions = [
    { label: "Slingshot", value: "Slingshot" },
    { label: "Atlatl", value: "Atlatl" },
    { label: "Kunai", value: "Kunai" },
    { label: "Hunga Munga", value: "Hunga Munga" },
    { label: "FRC", value: "FRC" },
    { label: "WWROBO", value: "WWROBO" },
    { label: "All", value: "All" },
  ];

  // ── State ───────────────────────────────────────────────────────────────────
  let syncing = $state(false);

  let activeTab = $state("budget");
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

  let selectedBudgetTeam = $state("FRC");

  let teamSpecificBudgetOrders = $derived(
    dataService.orders.filter((/** @type {any} */ o) => {
      // Westwood Overall shows all teams (aggregate)
      if (
        selectedBudgetTeam === "Westwood Overall" ||
        selectedBudgetTeam === "All"
      )
        return true;
      const t = (o.team || "").toLowerCase().trim();
      const s = selectedBudgetTeam.toLowerCase().trim();
      return t === s || t.includes(s);
    }),
  );

  // ── Lock ─────────────────────────────────────────────────────────────────────
  let unlocked = $state(false);

  // ── Data Loading ─────────────────────────────────────────────────────────────
  onMount(() => {
    dataService.load(); // Uses cache for instant load
  });

  async function sync() {
    syncing = true;
    await dataService.load(true);
    syncing = false;
  }

  // ── Derived totals ──────────────────────────────────────────────────────────
  let totalRaised = $derived(
    dataService.funds.reduce(
      (/** @type {number} */ sum, /** @type {any} */ f) =>
        sum + (Number(f.Amount) || 0),
      0,
    ),
  );

  let byType = $derived(() => {
    /** @type {Record<string, number>} */
    const map = {};
    for (const f of dataService.funds) {
      const t = f.Type || "Other";
      map[t] = (map[t] || 0) + (Number(f.Amount) || 0);
    }
    return map;
  });

  let budgetTeams = $derived(
    dataService.budget
      ? Object.entries(dataService.budget)
          .filter(([key]) => key !== "Total")
          .sort(([a], [b]) => {
            if (a === "FRC") return -1;
            if (b === "FRC") return 1;
            return a.localeCompare(b);
          })
      : [],
  );
  let budgetTotal = $derived(
    /** @type {any} */ (dataService.budget)?.Total ?? null,
  );
  let sortedFunds = $derived(
    dataService.funds
      .slice()
      .sort((/** @type {any} */ a, /** @type {any} */ b) => {
        let valA = a[sortCol] || "";
        let valB = b[sortCol] || "";
        if (sortCol === "Amount") {
          valA = Number(valA) || 0;
          valB = Number(valB) || 0;
        }
        if (valA < valB) return sortDir === "asc" ? -1 : 1;
        if (valA > valB) return sortDir === "asc" ? 1 : -1;
        return 0;
      }),
  );

  let teamSpecificFunds = $derived(
    dataService.funds.filter((/** @type {any} */ f) => {
      if (
        selectedBudgetTeam === "Westwood Overall" ||
        selectedBudgetTeam === "All"
      )
        return true;
      const r = String(f.Recipient || "")
        .toLowerCase()
        .trim();
      const s = selectedBudgetTeam.toLowerCase().trim();
      return r === s || r === "all";
    }),
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
      await dataService.load(true); // Force refresh shared store
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
  <title>Club Funding — Westwood Finance</title>
</svelte:head>

<div class="page-header">
  <div class="header-left">
    <h1>Club <span>Funding</span></h1>
    <p class="text-muted">Westwood Robotics Financial Management</p>
  </div>
  
  <div class="header-right" style="display: flex; align-items: center; gap: 12px;">
    <button class="btn btn-ghost btn-sm" onclick={sync} disabled={syncing}>
      <span class:spinning={syncing}>↻</span>
      {syncing ? "Syncing..." : "Refresh"}
    </button>
    
    {#if activeTab === "budget"}
      <div class="budget-team-selector {!dataService.hasLoadedOnce ? 'fade-in' : ''}" style="width: 180px;">
        <CustomDropdown
          options={[
            "FRC",
            "Slingshot",
            "Atlatl",
            "Kunai",
            "Hunga Munga",
            "WWROBO",
            "All",
          ]}
          bind:value={selectedBudgetTeam}
          placeholder="Select Team"
        />
      </div>
    {/if}
  </div>
</div>

<!-- ── Tab Nav ──────────────────────────────────────────────────────────────── -->
<div class="tabs-container">
  <div class="segmented-control">
    <div
      class="segment-highlight"
      style="transform: translateX(calc({['budget', 'history', 'add'].indexOf(activeTab)} * 100%));"
    ></div>
    {#each [["budget", "Team Dashboard"], ["history", "Funding History"], ["add", "+ Add Funds"]] as [key, label]}
      <button
        class="segment"
        class:active={activeTab === key}
        onclick={() => (activeTab = key)}
        id="tab-{key}">{label}</button
      >
    {/each}
  </div>
</div>





<!-- ══ OVERVIEW ══════════════════════════════════════════════════════════════ -->
{#if activeTab === "overview"}
  <!-- Summary strip -->
  <div class="stat-grid" class:fade-in={!dataService.hasLoadedOnce}>
    <div class="card">
      <div class="card-title">Total Raised</div>
      <div class="stat-value" style="color:#6bcb77">
        {formatCurrency(totalRaised)}
      </div>
      <div class="stat-sub">{dataService.funds.length} entries</div>
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
  {#if dataService.loading && !dataService.funds.length}
    <LoadingIndicator text="Fetching data..." />
  {:else}
    <div class="type-breakdown card">
      {#each typeOptions as type}
        {@const amount = byType()[type.value] || 0}
        {@const pct = totalRaised > 0 ? (amount / totalRaised) * 100 : 0}
        {@const color = TYPE_COLORS[type.value] || "#8a8a8a"}
        <div class="breakdown-row">
          <div class="breakdown-meta">
            <span class="breakdown-label" style="color:{color}">{type.label}</span>
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
  {#if dataService.loading && !dataService.funds.length}
    <LoadingIndicator text="Loading history..." />
  {:else if dataService.funds.length === 0}
    <div class="empty-state card">
      <div class="icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
      </div>
      No funding entries yet.
    </div>
  {:else}
    <div
      class="card history-card"
      class:fade-in={!dataService.hasLoadedOnce}
      style="padding:0; overflow:hidden; width:100%"
    >
      <table>
        <thead>
          <tr>
            <th class="sortable" onclick={() => toggleSort("Type")}
              >Type {sortCol === "Type"
                ? sortDir === "asc"
                  ? "↑"
                  : "↓"
                : ""}</th
            >
            <th class="sortable" onclick={() => toggleSort("Source")}
              >Source {sortCol === "Source"
                ? sortDir === "asc"
                  ? "↑"
                  : "↓"
                : ""}</th
            >
            <th class="sortable" onclick={() => toggleSort("Recipient")}
              >Team {sortCol === "Recipient"
                ? sortDir === "asc"
                  ? "↑"
                  : "↓"
                : ""}</th
            >
            <th class="sortable" onclick={() => toggleSort("Date")}
              >Date {sortCol === "Date"
                ? sortDir === "asc"
                  ? "↑"
                  : "↓"
                : ""}</th
            >
            <th class="sortable" onclick={() => toggleSort("Notes")}
              >Notes {sortCol === "Notes"
                ? sortDir === "asc"
                  ? "↑"
                  : "↓"
                : ""}</th
            >
            <th class="sortable text-right" onclick={() => toggleSort("Amount")}
              >Amount {sortCol === "Amount"
                ? sortDir === "asc"
                  ? "↑"
                  : "↓"
                : ""}</th
            >
          </tr>
        </thead>
        <tbody>
          {#each sortedFunds as entry}
            <tr class="fade-in">
              <td>
                <span
                  style="font-size: 1.05rem; font-weight: 500; color:{TYPE_COLORS[
                    entry.Type
                  ] || 'var(--text-muted)'}"
                >
                  {entry.Type || "—"}
                </span>
              </td>
              <td style="font-weight:500">{entry.Source || "—"}</td>
              <td>
                {entry.Recipient || "—"}
              </td>
              <td class="text-dim">
                <span class="date-chip" style="color: var(--text-dim);">
                  {formatFullDate(entry.Date)}
                </span>
              </td>
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
        <tfoot class="total-row-container">
          <tr>
            <td></td>
            <td colspan="4" style="font-weight:700; color:var(--text-muted)"
              >Total Raised</td
            >
            <td
              class="text-right monospace amount-total"
              style="font-weight:700"
            >
              {formatCurrency(totalRaised)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  {/if}

  <!-- ══ TEAM BUDGETS ═════════════════════════════════════════════════════════ -->
{:else if activeTab === "budget"}
  {#if dataService.loading && !dataService.budget}
    <LoadingIndicator text="Loading budgets..." />
  {:else if !dataService.budget}
    <div class="empty-state card">
      <div class="icon">📊</div>
      No budget data available.
    </div>
  {:else}
    <div
      class="budget-single-view"
      class:fade-in={!dataService.hasLoadedOnce}
      class:is-grid={selectedBudgetTeam === "All"}
      style="width:100%"
    >
      {#each budgetTeams as [team, data]}
        {#if selectedBudgetTeam === "All" || selectedBudgetTeam === "Westwood Overall" || team === selectedBudgetTeam}
          {@const teamFundsRaised = dataService.funds.reduce((sum, f) => {
            const r = String(f.Recipient || "").toLowerCase().trim();
            const s = team.toLowerCase().trim();
            if (r === s || r === "all") {
               return sum + (Number(f.Amount) || 0);
            }
            return sum;
          }, 0)}
          {@const baseFinal = data["Final"] ?? 0}
          {@const final = baseFinal + teamFundsRaised}
          {@const clubFunds = data["Club Funds"] ?? 0}
          {@const expenses = data["Expenses"] ?? 0}
          {@const personal = data["Personal Funds"] ?? 0}
          {@const pct =
            budgetTotal && budgetTotal["Final"] > 0
              ? Math.min(100, (final / budgetTotal["Final"]) * 100)
              : 0}

          <div
            class="budget-card card selected"
            style={selectedBudgetTeam === "All" ? "margin-bottom: 0;" : "max-width: 500px; margin: 0 auto 32px;"}
          >
            <div
              class="budget-team-name"
              style="font-size: 1.4rem; color: var(--primary);"
            >
              {team}
            </div>
            <div
              class="budget-final"
              style="color:{final >= 0
                ? '#6bcb77'
                : '#f16a4e'}; font-size: 2.2rem;"
            >
              {formatCurrency(final)}
            </div>
            <div class="budget-details" style="gap: 12px; margin-top: 20px;">
              <div class="budget-detail-row" style="font-size: 0.95rem;">
                <span class="text-muted">Raised</span>
                <span class="monospace" style="color:#6bcb77">+{formatCurrency(teamFundsRaised)}</span>
              </div>
              <div class="budget-detail-row" style="font-size: 0.95rem;">
                <span class="text-muted">Team Budget</span>
                <span class="monospace">{formatCurrency(clubFunds)}</span>
              </div>
              <div class="budget-detail-row" style="font-size: 0.95rem;">
                <span class="text-muted">Personal</span>
                <span class="monospace" style="color:#4e9af1"
                  >{formatCurrency(personal)}</span
                >
              </div>
              <div class="budget-detail-row" style="font-size: 0.95rem;">
                <span class="text-muted">Expenses</span>
                <span class="monospace" style="color:#f16a4e"
                  >{formatCurrency(Math.abs(expenses))}</span
                >
              </div>
            </div>
            <div class="budget-bar-track" style="margin-top:24px; height: 8px;">
              <div
                class="budget-bar-fill"
                style="width:{pct}%;background:var(--primary)"
              ></div>
            </div>
          </div>
        {/if}
      {/each}
    </div>

    <!-- Team Dashboard View -->
    <div class="team-dashboard-content fade-in" style="margin-top: 40px;">
      <div
        class="dashboard-stack"
        style="display: flex; flex-direction: column; gap: 40px;"
      >
        <!-- Section 1: Team Activity (Orders) -->
        <div class="activity-section">
          <div
            class="section-title"
            style="margin-bottom: 20px; font-size: 1.1rem; color: var(--text-muted);"
          >
            {selectedBudgetTeam} Activity
          </div>
          <OrderTable
            orders={teamSpecificBudgetOrders}
            hideTeamColumn={selectedBudgetTeam !== "Westwood Overall"}
          />
        </div>

        <!-- Section 2: Team Funding (Grants/Sponsors) -->
        <div class="funding-section">
          <div
            class="section-title"
            style="margin-bottom: 20px; font-size: 1.1rem; color: var(--text-muted);"
          >
            {selectedBudgetTeam} Funding
          </div>
          <div class="card" style="padding:0; overflow:hidden">
            {#if teamSpecificFunds.length === 0}
              <div class="empty-state" style="padding: 40px;">
                No funding entries for this team.
              </div>
            {:else}
              <table style="font-size: 0.85rem;">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Type</th>
                    <th class="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {#each teamSpecificFunds as f}
                    <tr>
                      <td style="font-weight:500">{f.Source || "—"}</td>
                      <td
                        ><span
                          style="font-size: 1.05rem; font-weight: 500; border-left: 2px solid {TYPE_COLORS[
                            f.Type
                           ] || '#ccc'}; padding-left: 8px;">{f.Type}</span
                        ></td
                      >
                      <td class="text-right monospace" style="color:#6bcb77"
                        >{formatCurrency(f.Amount)}</td
                      >
                    </tr>
                  {/each}
                </tbody>

                <tfoot>
                  <tr style="border-top: 2px solid var(--border);">
                    <td colspan="2" style="font-weight: 700; text-align: right; color: var(--text-muted); text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em;">Total Raised</td>
                    <td class="text-right monospace" style="color:#6bcb77; font-weight: 700; font-size: 1rem;">
                      {formatCurrency(teamSpecificFunds.reduce((sum, f) => sum + (Number(f.Amount) || 0), 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- ══ ADD FUNDS ════════════════════════════════════════════════════════════ -->
{:else if activeTab === "add"}
  {#if !unlocked}
    <AdminLock 
      onunlock={() => { unlocked = true; }} 
      title="Admin Login" 
      description="Enter the admin password to add a funding entry."
    />
  {:else}
    <div class="unlocked-header">
      <span class="unlocked-badge">Unlocked</span>
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
              <label for="f-type">History Type *</label>
              <CustomDropdown
                options={typeOptions}
                bind:value={form.type}
              />
            </div>

            <div class="form-group">
              <label for="f-recipient">Destination Team *</label>
              <CustomDropdown
                options={recipientOptions}
                bind:value={form.recipient}
              />
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
            Use <strong>All</strong> as recipient for club-wide income that gets
            distributed equally.
          </li>
          <li>
            <strong>Grants</strong> and <strong>Sponsors</strong> go to specific
            teams or WWROBO.
          </li>
          <li>The date field is optional but recommended for tracking.</li>
          <li>Entries appear in Funding History after submission.</li>
        </ul>

        <div style="margin-top:20px">
          <div class="card-title">Fund Types</div>
          <div
            style="display:flex;flex-direction:column;gap:6px;margin-top:8px"
          >
            {#each typeOptions as t}
              <span
                class="type-tag"
                style="border-left:3px solid {TYPE_COLORS[t.value] || '#8a8a8a'}"
              >
                {t.label}
              </span>
            {/each}
          </div>
        </div>
      </aside>
    </div>
  {/if}
{/if}

<style>
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
  .tabs-container {
    display: flex;
    justify-content: center;
    margin-bottom: 32px;
  }

  /* ── Tabs ──────────────────────────────────────────────────────────────────── */
  .segmented-control {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
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
    width: calc((100% - 8px) / 3);
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
    font-size: 0.75rem;
  }

  .sortable {
    cursor: pointer;
    user-select: none;
  }
  .sortable:hover {
    background: var(--surface-2);
  }

  .budget-card {
    padding: 24px;
  }
  .budget-team-name {
    font-size: 1.1rem;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .budget-final {
    font-size: 1.8rem;
    font-weight: 700;
    margin-bottom: 20px;
  }
  .budget-details {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .budget-detail-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
  }
  .budget-bar-track {
    height: 6px;
    background: var(--surface-2);
    border-radius: 99px;
    overflow: hidden;
  }
  .budget-bar-fill {
    height: 100%;
    transition: width 0.6s ease;
  }

  .add-layout {
    display: grid;
    grid-template-columns: 1fr 280px;
    gap: 24px;
    align-items: start;
  }
  @media (max-width: 800px) {
    .add-layout {
      grid-template-columns: 1fr;
    }
  }
  .add-card {
    padding: 32px;
  }
  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  .tips-card {
    padding: 24px;
    background: var(--surface-2);
  }
  .tips-list {
    margin: 12px 0 0 18px;
    padding: 0;
    font-size: 0.8rem;
    color: var(--text-muted);
  }
  .tips-list li {
    margin-bottom: 12px;
    line-height: 1.5;
  }
  .type-tag {
    font-size: 0.78rem;
    background: var(--surface);
    padding: 4px 10px;
    border-radius: 4px;
  }


  .total-row-container td {
    border-top: 1px solid var(--border);
    padding: 18px 14px !important;
    vertical-align: middle;
  }
  .total-row-container tr {
    position: relative;
  }
  .total-row-container tr::before {
    content: "";
    position: absolute;
    top: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background: #e07b30;
    z-index: 1;
  }
  .amount-total {
    color: #6bcb77;
    font-size: 1rem;
  }
  .date-chip {
    background: var(--surface-2);
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 500;
    white-space: nowrap;
    border: 1px solid var(--border);
  }

  /* ── Enhanced Budget View Styles ────────────────────── */
  .budget-single-view.is-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 32px;
    align-items: start;
  }
</style>
