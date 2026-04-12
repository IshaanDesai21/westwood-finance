<script>
  import { onMount } from 'svelte';
  import StatCard from '$lib/components/StatCard.svelte';
  import PieChart from '$lib/components/PieChart.svelte';
  import LineChart from '$lib/components/LineChart.svelte';
  import BarChart from '$lib/components/BarChart.svelte';
  import { formatCurrency } from '$lib/utils.js';

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  let stats = $state(null);
  let loading = $state(true);
  let err = $state('');

  onMount(fetchStats);

  async function fetchStats(sync = false) {
    loading = true;
    err = '';
    try {
      const res = await fetch(`${API}/stats${sync ? '?sync=true' : ''}`);
      stats = await res.json();
    } catch (e) {
      err = e.message;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Analytics — Westwood Finance</title>
</svelte:head>

<div class="page-header">
  <h1>Analytics <span>&amp; Stats</span></h1>
  <button class="btn btn-ghost btn-sm" id="stats-sync-btn" onclick={() => fetchStats(true)}>↻ Refresh</button>
</div>

{#if err}
  <div class="error-bar">⚠ {err}</div>
{/if}

{#if loading}
  <div class="empty-state"><span class="spinning" style="font-size:2rem">↻</span><br>Loading analytics…</div>
{:else if stats}
  <div class="stat-grid" style="margin-bottom:28px">
    <StatCard label="Total Spent" value={stats.totalSpent} isCurrency icon="$" />
    <StatCard label="Total Items" value={stats.totalItems} icon="☰" accentColor="#4e9af1" />
    <StatCard label="Avg Cost / Item" value={stats.avgCost} isCurrency icon="≈" accentColor="#6bcb77" />
    {#if stats.mostExpensive}
      <StatCard label="Most Expensive" value={stats.mostExpensive.total} isCurrency icon="↑" accentColor="#b97cf3" sub={stats.mostExpensive.item} />
    {/if}
    {#if stats.topVendor}
      <StatCard label="Top Vendor" value={stats.topVendor.company} icon="🏢" accentColor="#f1c84e" sub="{stats.topVendor.count} orders" />
    {/if}
  </div>

  <div class="charts-grid">
    <div class="card chart-card">
      <h3 class="chart-title">Category Breakdown</h3>
      {#if Object.values(stats.byCategory).some(v => v > 0)}
        <PieChart data={stats.byCategory} />
      {:else}
        <div class="empty-state" style="padding:40px">No data yet</div>
      {/if}
    </div>

    <div class="card chart-card">
      <h3 class="chart-title">Spending by Category</h3>
      <BarChart data={stats.byCategory} />
    </div>

    <div class="card chart-card chart-wide">
      <h3 class="chart-title">Monthly Spending Trends</h3>
      {#if stats.monthlyTrends.length > 0}
        <LineChart data={stats.monthlyTrends} />
      {:else}
        <div class="empty-state" style="padding:40px">No time data yet — timestamps needed</div>
      {/if}
    </div>
  </div>

  <div class="card" style="margin-top:24px">
    <h3 style="margin-bottom:16px">Category Breakdown</h3>
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
{/if}

<style>
  .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .chart-wide  { grid-column: 1 / -1; }
  .chart-card  { padding: 20px; }
  .chart-title { font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); margin-bottom: 16px; }
  @media (max-width: 800px) { .charts-grid { grid-template-columns: 1fr; } .chart-wide { grid-column: 1; } }
</style>
