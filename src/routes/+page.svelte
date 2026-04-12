<script>
  import { onMount } from 'svelte';
  import StatCard from '$lib/components/StatCard.svelte';
  import ExpenseTable from '$lib/components/ExpenseTable.svelte';
  import { expenses, loading as expensesLoading, error as expensesError, loadExpenses } from '$lib/stores/expenses.js';
  import { orders, loading as ordersLoading, error as ordersError, lastSynced, loadOrders } from '$lib/stores/orders.js';
  import { totalRaised, loading as fundingLoading, loadFunding } from '$lib/stores/funding.js';
  import { budgetCategories, budgetTotal, loadBudget } from '$lib/stores/budget.js';
  import { formatCurrency, formatDate } from '$lib/utils.js';

  /** @type {any} */
  let stats = $state(null);
  let syncing = $state(false);

  onMount(async () => {
    await Promise.all([loadExpenses(), loadOrders(), loadFunding(), loadBudget()]);
    await fetchStats();
  });

  async function fetchStats() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/stats`);
      stats = await res.json();
    } catch (e) {
      console.error('Stats fetch failed:', e);
    }
  }

  async function sync() {
    syncing = true;
    await loadOrders(true);
    await loadExpenses();
    await loadFunding(true);
    await loadBudget();
    await fetchStats();
    syncing = false;
  }

  let recentExpenses = $derived($expenses.slice(-5).reverse());
  let recentOrders   = $derived($orders.slice(-5).reverse());
  let topCat = $derived(stats ? Object.entries(stats.byCategory || {}).sort(([,a],[,b]) => b - a)[0] : null);

  // ── Budget calculations ─────────────────────────────────────────────────────
  const CATEGORY_LABELS = /** @type {Record<string,string>} */ ({
    hardware: 'Hardware',
    software: 'Software',
    outreach: 'Outreach',
    food: 'Food',
    miscellaneous: 'Misc',
  });
  const CATEGORY_COLORS = /** @type {Record<string,string>} */ ({
    hardware:      'var(--cat-hardware)',
    software:      'var(--cat-software)',
    outreach:      'var(--cat-outreach)',
    food:          '#f1a94e',
    miscellaneous: 'var(--cat-miscellaneous)',
  });

  // Spending per category from expenses store
  let spentByCategory = $derived(() => {
    const map = /** @type {Record<string,number>} */ ({});
    for (const e of $expenses) {
      const cat = e.category || 'miscellaneous';
      map[cat] = (map[cat] || 0) + (e.total || 0);
    }
    return map;
  });

  let totalSpentLocal = $derived($expenses.reduce((s, e) => s + (e.total || 0), 0));
  let moneyRemaining  = $derived($totalRaised - totalSpentLocal);

  // Budget progress: budgetTotal vs totalSpent
  let budgetPct = $derived(
    $budgetTotal > 0 ? Math.min(100, (totalSpentLocal / $budgetTotal) * 100) : null
  );

  let topCatPct = $derived(
    topCat && stats?.totalSpent > 0 ? (topCat[1] / stats.totalSpent) * 100 : null
  );
  let mostExpPct = $derived(
    stats?.mostExpensive && stats?.totalSpent > 0
      ? (stats.mostExpensive.total / stats.totalSpent) * 100 : null
  );
  let avgPct = $derived(
    stats?.avgCost && stats?.mostExpensive?.total
      ? Math.min(100, (stats.avgCost / stats.mostExpensive.total) * 100) : null
  );
  let vendorPct = $derived(
    stats?.topVendor && stats?.totalItems > 0
      ? (stats.topVendor.count / stats.totalItems) * 100 : null
  );
</script>

<svelte:head>
  <title>Dashboard — Westwood Finance</title>
</svelte:head>

<div class="page-header">
  <h1>Dashboard <span>Overview</span></h1>
  <div style="display:flex;gap:10px;align-items:center">
    {#if $lastSynced}
      <span class="text-muted" style="font-size:0.78rem">
        Synced {formatDate((/** @type {any} */ ($lastSynced)).toISOString())}
      </span>
    {/if}
    <button
      id="sync-btn"
      class="btn btn-ghost btn-sm"
      onclick={sync}
      disabled={syncing || $ordersLoading}
      aria-label="Sync from Google Sheets"
    >
      <span class:spinning={syncing}>↻</span>
      {syncing ? 'Syncing…' : 'Sync'}
    </button>
    <a href="/add" class="btn btn-primary btn-sm" id="quick-add-btn">+ Add Expense</a>
  </div>
</div>

{#if $expensesError || $ordersError}
  <div class="error-bar">⚠ {$expensesError || $ordersError}</div>
{/if}

<!-- ── Stat Cards ─────────────────────────────────────────────────────────── -->
<div class="stat-grid">
  <StatCard
    label="Total Spent"
    value={totalSpentLocal}
    isCurrency
    icon="$"
    accentColor="var(--primary)"
    sub="{$expenses.length} expenses logged"
    progress={budgetPct !== null ? budgetPct : totalSpentLocal > 0 ? 100 : 0}
    progressLabel={budgetPct !== null ? `${budgetPct.toFixed(0)}% of budget` : ''}
  />

  <StatCard
    label="Money Remaining"
    value={moneyRemaining}
    isCurrency
    icon="◯"
    accentColor={moneyRemaining >= 0 ? '#6bcb77' : '#f16a4e'}
    sub="of {formatCurrency($totalRaised)} raised"
    progress={$totalRaised > 0 ? Math.min(100, Math.max(0, (moneyRemaining / $totalRaised) * 100)) : 0}
    progressLabel="{$totalRaised > 0 ? ((moneyRemaining / $totalRaised) * 100).toFixed(0) : 0}% remaining"
  />

  <StatCard
    label="Total Budget"
    value={$budgetTotal}
    isCurrency
    icon="▦"
    accentColor="#4e9af1"
    sub="across {Object.keys($budgetCategories).length} categories"
    progress={budgetPct ?? 0}
    progressLabel={budgetPct !== null ? `${budgetPct.toFixed(0)}% used` : '0% used'}
  />

  <StatCard
    label="Top Category"
    value={topCat ? topCat[0] : '—'}
    icon="◈"
    accentColor="var(--cat-hardware)"
    sub={topCat ? formatCurrency(topCat[1]) + ' spent' : 'No data'}
    progress={topCatPct ?? 0}
    progressLabel={topCatPct !== null ? `${topCatPct.toFixed(0)}% of total` : '0%'}
  />

  {#if stats?.topVendor}
    <StatCard
      label="Top Vendor"
      value={stats.topVendor.company}
      icon="🏢"
      accentColor="#6bcb77"
      sub="{stats.topVendor.count} orders placed"
      progress={vendorPct ?? 0}
      progressLabel={vendorPct !== null ? `${vendorPct.toFixed(0)}% of orders` : '0%'}
    />
  {/if}

  {#if stats?.mostExpensive}
    <StatCard
      label="Most Expensive"
      value={stats.mostExpensive.total}
      isCurrency
      icon="↑"
      accentColor="#b97cf3"
      sub={stats.mostExpensive.item}
      progress={mostExpPct ?? 0}
      progressLabel={mostExpPct !== null ? `${mostExpPct.toFixed(0)}% of total` : '0%'}
    />
  {/if}
</div>

<!-- ── Budget Breakdown ───────────────────────────────────────────────────── -->
<div class="section-title" style="margin-top:36px">Budget Breakdown</div>
<div class="card budget-breakdown">
  {#each Object.entries($budgetCategories) as [cat, budgeted]}
    {@const spent = spentByCategory()[cat] || 0}
    {@const pct = budgeted > 0 ? Math.min(100, (spent / budgeted) * 100) : 0}
    {@const color = CATEGORY_COLORS[cat] || '#8a8a8a'}
    <div class="budget-row">
      <div class="budget-meta">
        <span class="budget-label">{CATEGORY_LABELS[cat] || cat}</span>
        <span class="budget-amounts">{formatCurrency(spent)} <span class="text-muted">/ {formatCurrency(budgeted)}</span></span>
      </div>
      <div class="budget-bar-track">
        <div
          class="budget-bar-fill"
          style="width:{pct}%;background:{pct >= 90 ? '#f16a4e' : color}"
        ></div>
      </div>
      <span class="budget-pct" style="color:{pct >= 90 ? '#f16a4e' : color}">{pct.toFixed(0)}%</span>
    </div>
  {/each}
</div>

<!-- ── Recent Activity ────────────────────────────────────────────────────── -->
<div style="margin-top:32px" class="dashboard-tables">
  <div class="table-column">
    <div class="section-title">Recent Expenses</div>
    {#if $expensesLoading}
      <div class="empty-state"><span class="spinning">↻</span> Loading…</div>
    {:else}
      <div class="card" style="padding:0;overflow:hidden">
        <ExpenseTable expenses={recentExpenses} />
      </div>
      {#if $expenses.length > 5}
        <div style="margin-top:12px;text-align:right">
          <a href="/expenses" class="btn btn-ghost btn-sm">View all {$expenses.length} expenses →</a>
        </div>
      {/if}
    {/if}
  </div>

  <div class="table-column">
    <div class="section-title">Recent Orders (Sheets)</div>
    {#if $ordersLoading}
      <div class="empty-state"><span class="spinning">↻</span> Loading…</div>
    {:else}
      <div class="card" style="padding:0;overflow:hidden">
        <ExpenseTable expenses={recentOrders} />
      </div>
      {#if $orders.length > 5}
        <div style="margin-top:12px;text-align:right">
          <a href="/orders" class="btn btn-ghost btn-sm">View all {$orders.length} orders →</a>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .dashboard-tables {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
  }
  @media (max-width: 1100px) {
    .dashboard-tables { grid-template-columns: 1fr; }
  }

  /* Budget breakdown */
  .budget-breakdown {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .budget-row {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    gap: 6px 12px;
    align-items: center;
  }
  .budget-meta {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .budget-label {
    font-weight: 600;
    font-size: 0.875rem;
  }
  .budget-amounts {
    font-size: 0.82rem;
    font-weight: 500;
  }
  .budget-bar-track {
    grid-column: 1;
    height: 6px;
    background: var(--surface-2);
    border-radius: 999px;
    overflow: hidden;
  }
  .budget-bar-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.4s ease;
  }
  .budget-pct {
    grid-column: 2;
    grid-row: 1 / 3;
    font-size: 0.82rem;
    font-weight: 700;
    min-width: 36px;
    text-align: right;
  }
</style>
