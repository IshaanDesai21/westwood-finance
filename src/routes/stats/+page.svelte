<script>
  import { onMount } from 'svelte';
  import StatCard from '$lib/components/StatCard.svelte';
  import PieChart from '$lib/components/PieChart.svelte';
  import LineChart from '$lib/components/LineChart.svelte';
  import BarChart from '$lib/components/BarChart.svelte';
  import LoadingIndicator from '$lib/components/LoadingIndicator.svelte';
  import { formatCurrency } from '$lib/utils.js';
  import { dataService } from '$lib/dataService.svelte.js';

  /** @typedef {import('$lib/dataService.svelte.js').Order} Order */

  /** @type {{ orders: Order[], loading: boolean, error: string|null }} */
  let { orders, loading, error } = $derived(dataService);
  let syncing = $state(false);

  async function sync() {
    syncing = true;
    await dataService.load(true);
    syncing = false;
  }

  onMount(() => {
    dataService.load();
  });

  // ── Stats Calculations ──────────────────────────────────────────────────────
  
  // Only "Received" orders count towards spending analytics
  let expenses = $derived(
    orders
      .filter((/** @type {Order} */ o) => o.status?.toLowerCase().trim() === 'received')
      .map((/** @type {Order} */ o) => ({
        ...o,
        month: (o.timestamp || "").toString().slice(0, 7), // "YYYY-MM"
      }))
  );

  /** @type {{ 
    totalSpent: number, 
    totalItems: number, 
    avgCost: number, 
    mostExpensive: any, 
    topVendor: {company: string, count: number} | null, 
    byCategory: Record<string, number>, 
    monthlyTrends: Array<{month: string, amount: number}> 
  }} */
  let stats = $derived({
    totalSpent: expenses.reduce((/** @type {number} */ sum, /** @type {any} */ e) => sum + e.total, 0),
    totalItems: expenses.length,
    avgCost: expenses.length > 0 ? (expenses.reduce((/** @type {number} */ sum, /** @type {any} */ e) => sum + e.total, 0) / expenses.length) : 0,
    
    mostExpensive: expenses.length > 0 ? [...expenses].sort((a,b) => b.total - a.total)[0] : null,
    
    topVendor: (() => {
      if (expenses.length === 0) return null;
      /** @type {Record<string, number>} */
      const map = {};
      expenses.forEach((/** @type {any} */ e) => map[e.company] = (map[e.company] || 0) + 1);
      const top = Object.entries(map).sort(([,a],[,b]) => b - a)[0];
      return { company: top[0], count: top[1] };
    })(),

    byCategory: (() => {
      /** @type {Record<string, number>} */
      const map = {};
      expenses.forEach((/** @type {any} */ e) => map[e.category] = (map[e.category] || 0) + e.total);
      return map;
    })(),

    monthlyTrends: (() => {
      /** @type {Record<string, number>} */
      const map = {};
      expenses.forEach((/** @type {any} */ e) => {
        if (e.month) map[e.month] = (map[e.month] || 0) + e.total;
      });
      return Object.entries(map)
        .map(([month, amount]) => ({ month, amount }))
        .sort((a,b) => a.month.localeCompare(b.month));
    })()
  });

</script>

<svelte:head>
  <title>Analytics — Westwood Finance</title>
</svelte:head>

<div class="page-header">
  <h1>Analytics <span>&amp; Stats</span></h1>
  <button class="btn btn-ghost btn-sm" onclick={sync} disabled={syncing}>
    <span class:spinning={syncing || (loading && !orders.length)}>↻</span> {syncing ? "Refreshing..." : "Refresh"}
  </button>
</div>

{#if error}
  <div class="error-bar">⚠ {error}</div>
{/if}

{#if loading && !orders.length}
  <LoadingIndicator text="Analyzing financial data…" />
{:else if expenses.length > 0}
  <div class="fade-in">
    <div class="stat-grid" style="margin-bottom:28px">
      <StatCard label="Total Spent" value={stats.totalSpent.toString()} isCurrency icon="$" />
      <StatCard label="Total Items" value={stats.totalItems.toString()} icon="☰" accentColor="#4e9af1" />
      <StatCard label="Avg Cost / Item" value={stats.avgCost.toString()} isCurrency icon="≈" accentColor="#6bcb77" />
      {#if stats.mostExpensive}
        <StatCard label="Most Expensive" value={stats.mostExpensive.total.toString()} isCurrency icon="↑" accentColor="#b97cf3" sub={stats.mostExpensive.item} />
      {/if}
      {#if stats.topVendor}
        <StatCard label="Top Vendor" value={stats.topVendor.company} icon="🏢" accentColor="#f1c84e" sub="{stats.topVendor.count} orders" />
      {/if}
    </div>

    <div class="charts-grid">
      <div class="card chart-card">
        <h3 class="chart-title">Category Breakdown</h3>
        <div class="chart-container">
          <PieChart data={stats.byCategory} />
        </div>
      </div>

      <div class="card chart-card">
        <h3 class="chart-title">Spending by Category</h3>
        <div class="chart-container">
          <BarChart data={stats.byCategory} />
        </div>
      </div>

      <div class="card chart-card chart-wide">
        <h3 class="chart-title">Monthly Spending Trends</h3>
        {#if stats.monthlyTrends.length > 0}
          <div class="chart-container-wide">
            <LineChart data={stats.monthlyTrends} />
          </div>
        {:else}
          <div class="empty-state" style="padding:40px">No time data available yet</div>
        {/if}
      </div>
    </div>

    <div class="card stats-table-card" style="margin-top:24px; padding:0; overflow:hidden;">
      <div style="padding: 20px 24px; border-bottom: 1px solid var(--border)">
        <h3 style="margin:0">Category Details</h3>
      </div>
      <table>
        <thead>
          <tr><th>Category</th><th class="text-right">Spent</th><th class="text-right">% of Total</th></tr>
        </thead>
        <tbody>
          {#each Object.entries(stats.byCategory).sort(([,a],[,b]) => b-a) as [cat, amt]}
            <tr>
              <td><span class="badge badge-{cat}">{cat.charAt(0).toUpperCase()+cat.slice(1)}</span></td>
              <td class="text-right monospace">{formatCurrency(amt)}</td>
              <td class="text-right text-muted">
                {stats.totalSpent > 0 ? ((amt / stats.totalSpent) * 100).toFixed(1) : '0.0'}%
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{:else}
  <div class="empty-state card">
    <div class="icon">📊</div>
    <h3>No analytical data found</h3>
    <p>Stats only include items marked as "Received". once you have orders fulfilled, they will appear here.</p>
  </div>
{/if}

<style>
  .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .chart-wide  { grid-column: 1 / -1; }
  .chart-card  { padding: 24px; display: flex; flex-direction: column; }
  .chart-title { font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); margin-bottom: 20px; }
  
  .chart-container { height: 260px; width: 100%; position: relative; }
  .chart-container-wide { height: 320px; width: 100%; position: relative; }

  .stats-table-card table { margin: 0; }
  .stats-table-card table tbody tr:last-child { border-bottom: none; }

  @media (max-width: 900px) { 
    .charts-grid { grid-template-columns: 1fr; } 
    .chart-wide { grid-column: 1; } 
  }
</style>
