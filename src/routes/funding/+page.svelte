<script>
  import { onMount } from "svelte";
  import {
    formatCurrency,
    formatFullDate,
    getTeamBadgeClass,
    CATEGORIES,
  } from "$lib/utils.js";
  import CustomDropdown from "$lib/components/CustomDropdown.svelte";
  import LoadingIndicator from "$lib/components/LoadingIndicator.svelte";
  import OrderTable from "$lib/components/OrderTable.svelte";
  import { dataService } from "$lib/dataService.svelte.js";
  import { BASE_URL, SECRET_KEY } from "$lib/config.js";
  import AdminLock from "$lib/components/AdminLock.svelte";
  import PieChart from "$lib/components/PieChart.svelte";

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
    { label: "Westwood Overall", value: "Westwood Overall" },
  ];

  // ── State ───────────────────────────────────────────────────────────────────
  let syncing = $state(false);

  let activeTab = $state("budget");
  let sortCol = $state("Date");
  let sortDir = $state("desc");

  let selectedBudgetTeam = $state("FRC");

  let teamSpecificBudgetOrders = $derived(
    dataService.orders.filter((/** @type {any} */ o) => {
      // Westwood Overall shows all teams (aggregate)
      if (selectedBudgetTeam === "Westwood Overall") return true;
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
  let teamSpecificFunds = $derived(
    dataService.funds.filter((/** @type {any} */ f) => {
      if (selectedBudgetTeam === "Westwood Overall") return true;
      const r = String(f.Recipient || "")
        .toLowerCase()
        .trim();
      const s = selectedBudgetTeam.toLowerCase().trim();
      return r === s || r === "all";
    }),
  );

  let sortedFunds = $derived(
    teamSpecificFunds
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

  function toggleSort(/** @type {string} */ col) {
    if (sortCol === col) {
      sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      sortCol = col;
      sortDir = col === "Date" || col === "Amount" ? "desc" : "asc";
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

  const CATEGORY_LABELS = /** @type {Record<string,string>} */ ({
    hardware: "Hardware",
    software: "Software",
    outreach: "Outreach",
    food: "Food",
    miscellaneous: "Misc",
  });

  let spentByCategory = $derived.by(() => {
    const map = /** @type {Record<string,number>} */ ({});
    CATEGORIES.forEach((c) => (map[c] = 0));

    // Filter team specific orders by status for "Spent" calculation
    const expenses = teamSpecificBudgetOrders.filter((o) => {
      const s = (o.status || "").toLowerCase().trim();
      return s === "received" || s === "ordered" || s === "approved";
    });

    for (const e of expenses) {
      const cat = (e.category || "miscellaneous").toLowerCase().trim();
      map[cat] = (map[cat] || 0) + (e.total || 0);
    }
    return map;
  });

  let totalSpentForBreakdown = $derived(
    Object.values(spentByCategory).reduce((sum, val) => sum + val, 0),
  );
</script>

<svelte:head>
  <title>Team Dashboard | Westwood Finance</title>
</svelte:head>

<div class="page-header">
  <div class="header-left">
    <h1>Team <span>Dashboard</span></h1>
  </div>

  <div
    class="header-right"
    style="display: flex; align-items: center; gap: 12px;"
  >
    <button class="btn btn-ghost btn-sm" onclick={sync} disabled={syncing}>
      <span class:spinning={syncing}>↻</span>
      {syncing ? "Syncing..." : "Refresh"}
    </button>

    <div
      class="budget-team-selector {!dataService.hasLoadedOnce ? 'fade-in' : ''}"
      style="width: 180px;"
    >
      <CustomDropdown
        options={[
          "FRC",
          "Slingshot",
          "Atlatl",
          "Kunai",
          "Hunga Munga",
          "Westwood Overall",
        ]}
        bind:value={selectedBudgetTeam}
        placeholder="Select Team"
      />
    </div>
  </div>
</div>

<!-- ── Tab Nav ──────────────────────────────────────────────────────────────── -->
<div class="tabs-container">
  <div class="segmented-control">
    <div
      class="segment-highlight"
      style="transform: translateX(calc({['budget', 'history'].indexOf(
        activeTab,
      )} * 100%));"
    ></div>
    {#each [["budget", "Team Dashboard"], ["history", `${selectedBudgetTeam} Funding`]] as [key, label]}
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
            <span class="breakdown-label" style="color:{color}"
              >{type.label}</span
            >
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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1"
          stroke-linecap="round"
          stroke-linejoin="round"
          ><circle cx="12" cy="12" r="10" /><path
            d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"
          /><path d="M12 18V6" /></svg
        >
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
        <tfoot class="total-row">
          <tr>
            <td colspan="5" class="total-label">Total Raised</td>
            <td class="text-right monospace total-amount">
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
      <div class="icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linecap="round"
          stroke-linejoin="round"
          ><line x1="18" y1="20" x2="18" y2="10" /><line
            x1="12"
            y1="20"
            x2="12"
            y2="4"
          /><line x1="6" y1="20" x2="6" y2="14" /></svg
        >
      </div>
      No budget data available.
    </div>
  {:else}
    <div
      class="budget-overview-container"
      class:is-single={selectedBudgetTeam !== "Westwood Overall"}
    >
      <div
        class="budget-single-view"
        class:fade-in={!dataService.hasLoadedOnce}
        class:is-grid={selectedBudgetTeam === "Westwood Overall"}
      >
        {#each budgetTeams as [team, data]}
          {#if selectedBudgetTeam === "Westwood Overall" || team === selectedBudgetTeam}
            {@const teamFundsRaised = dataService.funds.reduce((sum, f) => {
              const r = String(f.Recipient || "")
                .toLowerCase()
                .trim();
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
              style={selectedBudgetTeam === "Westwood Overall"
                ? "margin-bottom: 0;"
                : "border-color: var(--border);"}
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
                  <span class="monospace" style="color:#6bcb77"
                    >+{formatCurrency(teamFundsRaised)}</span
                  >
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
              <div
                class="budget-bar-track"
                style="margin-top:24px; height: 8px;"
              >
                <div
                  class="budget-bar-fill"
                  style="width:{pct}%;background:var(--primary)"
                ></div>
              </div>
            </div>
          {/if}
        {/each}
      </div>

      {#if selectedBudgetTeam !== "Westwood Overall"}
        <div class="breakdown-card fade-in">
          <PieChart data={spentByCategory} hideLegend={true} />
        </div>
      {/if}
    </div>

    <!-- Team Dashboard View -->
    <div class="team-dashboard-content fade-in" style="margin-top: 40px;">
      <div
        class="dashboard-stack"
        style="display: flex; flex-direction: column; gap: 40px;"
      >
        <!-- Activity Section -->
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
      </div>
    </div>
  {/if}

  <!-- ══ TEAM HISTORY ═════════════════════════════════════════════════════════ -->
{:else if activeTab === "history"}
  <div class="team-dashboard-content fade-in">
    <div
      class="dashboard-stack"
      style="display: flex; flex-direction: column; gap: 40px;"
    >
      <!-- Section 2: Team Funding (Grants/Sponsors) -->
      <div class="funding-section">
        <div
          class="section-title"
          style="margin-bottom: 20px; font-size: 1.1rem; color: var(--text-muted);"
        >
          {selectedBudgetTeam} History
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

              <tfoot class="total-row">
                <tr>
                  <td colspan="2" class="total-label">Total Raised</td>
                  <td class="text-right monospace total-amount">
                    {formatCurrency(
                      teamSpecificFunds.reduce(
                        (sum, f) => sum + (Number(f.Amount) || 0),
                        0,
                      ),
                    )}
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

<style>
  .tabs-container {
    display: flex;
    justify-content: center;
    margin-bottom: 32px;
  }

  /* ── Tabs ──────────────────────────────────────────────────────────────────── */
  .segmented-control {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
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
    width: calc((100% - 8px) / 2);
    background: var(--surface);
    border-radius: 99px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
    padding: 20px 24px;
    width: 100%;
    max-width: 420px;
    min-height: 260px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    border: 1px solid var(--border); /* Default muted border */
  }
  .budget-card.selected {
    border-color: var(--border-bright) !important;
    box-shadow: var(--shadow-md);
  }

  /* Wide card for single team view */
  .is-single .budget-card {
    width: 500px;
    max-width: none;
    padding: 28px 32px;
  }
  .budget-team-name {
    font-size: 1.1rem;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .budget-final {
    font-size: 1.6rem;
    font-weight: 700;
    margin-bottom: 16px;
  }
  .budget-details {
    display: flex;
    flex-direction: column;
    gap: 8px;
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
  .budget-overview-container {
    display: flex;
    flex-direction: column;
    gap: 32px;
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
  }

  .budget-overview-container.is-single {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 40px;
    max-width: 1100px;
    margin: 0 auto;
  }

  .budget-single-view:not(.is-grid) {
    display: flex;
    justify-content: center;
    width: auto;
  }

  @media (max-width: 950px) {
    .budget-overview-container.is-single {
      flex-direction: column;
      gap: 32px;
    }
  }

  .budget-single-view.is-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    align-items: start;
  }

  .breakdown-card {
    height: 260px; /* Matching budget card min-height */
    width: 260px;
    flex-shrink: 0;
    background: transparent;
    border: none;
    box-shadow: none;
    padding: 0;
    position: relative;
  }
</style>
