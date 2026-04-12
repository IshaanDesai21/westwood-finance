<script>
  import { onMount } from 'svelte';
  import StatCard from '$lib/components/StatCard.svelte';
  import ExpenseTable from '$lib/components/ExpenseTable.svelte';
  import { expenses, loading, error, lastSynced, loadExpenses } from '$lib/stores/expenses.js';
  import { formatCurrency, formatDate } from '$lib/utils.js';

  let stats = $state(null);
  let syncing = $state(false);

  onMount(async () => {
    await loadExpenses();
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
    await loadExpenses(true);
    await fetchStats();
    syncing = false;
  }

  let recent = $derived($expenses.slice(-5).reverse());
  let topCat = $derived(stats ? Object.entries(stats.byCategory || {}).sort(([,a],[,b]) => b - a)[0] : null);
</script>

<svelte:head>
  <title>Dashboard — Westwood Finance</title>
</svelte:head>

<div class="page-header">
  <h1>Dashboard <span>Overview</span></h1>
  <div style="display:flex;gap:10px;align-items:center">
    {#if $lastSynced}
      <span class="text-muted" style="font-size:0.78rem">
        Synced {formatDate($lastSynced.toISOString())}
      </span>
    {/if}
    <button
      id="sync-btn"
      class="btn btn-ghost btn-sm"
      onclick={sync}
      disabled={syncing || $loading}
      aria-label="Sync from Google Sheets"
    >
      <span class:spinning={syncing}>↻</span>
      {syncing ? 'Syncing…' : 'Sync Sheet'}
    </button>
    <a href="/add" class="btn btn-primary btn-sm" id="quick-add-btn">+ Add Expense</a>
  </div>
</div>

{#if $error}
  <div class="error-bar">⚠ {$error}</div>
{/if}

<!-- ── Stat Cards ─────────────────────────────────────────────────────────── -->
<div class="stat-grid">
  <StatCard
    label="Total Spent"
    value={stats?.totalSpent ?? 0}
    isCurrency
    icon="$"
    accentColor="var(--primary)"
    sub="{stats?.totalItems ?? 0} items"
  />
  <StatCard
    label="Avg Cost / Item"
    value={stats?.avgCost ?? 0}
    isCurrency
    icon="≈"
    accentColor="#4e9af1"
  />
  <StatCard
    label="Top Category"
    value={topCat ? topCat[0] : '—'}
    icon="◈"
    accentColor="var(--cat-hardware)"
    sub={topCat ? formatCurrency(topCat[1]) : ''}
  />
  {#if stats?.topVendor}
    <StatCard
      label="Top Vendor"
      value={stats.topVendor.company}
      icon="🏢"
      accentColor="#6bcb77"
      sub="{stats.topVendor.count} orders"
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
    />
  {/if}
  {#if stats?.seasonBudget !== null && stats?.seasonBudget !== undefined}
    <StatCard
      label="Budget Remaining"
      value={stats.budgetRemaining}
      isCurrency
      icon="◯"
      accentColor={stats.budgetRemaining < 0 ? '#f16a4e' : '#6bcb77'}
      sub="of {formatCurrency(stats.seasonBudget)} budget"
    />
  {/if}
</div>

<!-- ── Recent Expenses ────────────────────────────────────────────────────── -->
<div style="margin-top:32px">
  <div class="section-title">Recent Expenses</div>
  {#if $loading}
    <div class="empty-state"><span class="spinning">↻</span> Loading…</div>
  {:else}
    <div class="card" style="padding:0;overflow:hidden">
      <ExpenseTable expenses={recent} />
    </div>
    {#if $expenses.length > 5}
      <div style="margin-top:12px;text-align:right">
        <a href="/expenses" class="btn btn-ghost btn-sm">View all {$expenses.length} expenses →</a>
      </div>
    {/if}
  {/if}
</div>
