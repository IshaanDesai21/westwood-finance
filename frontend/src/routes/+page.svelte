<script>
  import { onMount } from 'svelte';
  import StatCard from '$lib/components/StatCard.svelte';
  import ExpenseTable from '$lib/components/ExpenseTable.svelte';
  import { expenses, loading as expensesLoading, error as expensesError, loadExpenses } from '$lib/stores/expenses.js';
  import { orders, loading as ordersLoading, error as ordersError, lastSynced, loadOrders } from '$lib/stores/orders.js';
  import { formatCurrency, formatDate } from '$lib/utils.js';

  /** @type {any} */
  let stats = $state(null);
  /** @type {any} */
  let lastSyncedDate = $state(null);
  let syncing = $state(false);

  onMount(async () => {
    await loadExpenses();
    await loadOrders();
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
    await loadOrders(true); // Sync orders from Google Sheets
    await loadExpenses();   // Just reload from local DB
    await fetchStats();
    syncing = false;
  }

  let recentExpenses = $derived($expenses.slice(-5).reverse());
  let recentOrders = $derived($orders.slice(-5).reverse());
  let topCat = $derived(stats ? Object.entries(stats.byCategory || {}).sort(([,a],[,b]) => b - a)[0] : null);

  // ── Progress helpers ────────────────────────────────────────────────────────
  // Budget progress: how much of the season budget has been spent
  let budgetPct = $derived(
    stats?.seasonBudget
      ? Math.min(100, (stats.totalSpent / stats.seasonBudget) * 100)
      : null
  );

  // Top category: % of total spending it represents
  let topCatPct = $derived(
    topCat && stats?.totalSpent > 0
      ? (topCat[1] / stats.totalSpent) * 100
      : null
  );

  // Most expensive item: % of total spending
  let mostExpPct = $derived(
    stats?.mostExpensive && stats?.totalSpent > 0
      ? (stats.mostExpensive.total / stats.totalSpent) * 100
      : null
  );

  // Avg cost: % of max item price (the most expensive item)
  let avgPct = $derived(
    stats?.avgCost && stats?.mostExpensive?.total
      ? Math.min(100, (stats.avgCost / stats.mostExpensive.total) * 100)
      : null
  );

  // Top vendor count: % of total items they supplied
  let vendorPct = $derived(
    stats?.topVendor && stats?.totalItems > 0
      ? (stats.topVendor.count / stats.totalItems) * 100
      : null
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
      {syncing ? 'Syncing…' : 'Sync Orders'}
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
    value={stats?.totalSpent ?? 0}
    isCurrency
    icon="$"
    accentColor="var(--primary)"
    sub="{stats?.totalItems ?? 0} items logged"
    progress={budgetPct !== null ? budgetPct : stats?.totalSpent > 0 ? 100 : 0}
    progressLabel={budgetPct !== null ? `${budgetPct.toFixed(0)}% of budget` : ''}
  />

  <StatCard
    label="Avg Cost / Item"
    value={stats?.avgCost ?? 0}
    isCurrency
    icon="≈"
    accentColor="#4e9af1"
    sub="Mean purchase price"
    progress={avgPct ?? 0}
    progressLabel={avgPct !== null ? `${avgPct.toFixed(0)}% of max` : '0%'}
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

  {#if stats?.seasonBudget !== null && stats?.seasonBudget !== undefined}
    <StatCard
      label="Budget Remaining"
      value={stats.budgetRemaining}
      isCurrency
      icon="◯"
      accentColor={stats.budgetRemaining < 0 ? '#f16a4e' : '#6bcb77'}
      sub="of {formatCurrency(stats.seasonBudget)} season budget"
      progress={100 - (budgetPct ?? 0)}
      progressLabel="{(100 - (budgetPct ?? 0)).toFixed(0)}% left"
    />
  {/if}
</div>

<!-- ── Recent Activity ────────────────────────────────────────────────────── -->
<div style="margin-top:32px" class="dashboard-tables">
  <div class="table-column">
    <div class="section-title">Recent Expenses (Local)</div>
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
    <div class="section-title">Recent Part Orders (Sheets)</div>
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
    .dashboard-tables {
      grid-template-columns: 1fr;
    }
  }
</style>
