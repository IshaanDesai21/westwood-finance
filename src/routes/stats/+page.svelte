<script>
  import { onMount } from 'svelte';
  import StatCard from '$lib/components/StatCard.svelte';
  import PieChart from '$lib/components/PieChart.svelte';
  import LineChart from '$lib/components/LineChart.svelte';
  import BarChart from '$lib/components/BarChart.svelte';
  import LoadingIndicator from '$lib/components/LoadingIndicator.svelte';
  import CustomDropdown from '$lib/components/CustomDropdown.svelte';
  import { formatCurrency, formatDate, CATEGORIES, STATUS_COLORS } from "$lib/utils.js";
  import { dataService } from '$lib/dataService.svelte.js';

  /** @typedef {import('$lib/dataService.svelte.js').Order} Order */

  /** @type {{ orders: Order[], loading: boolean, error: string|null }} */
  let { orders, loading, error } = $derived(dataService);
  let syncing = $state(false);

  const TEAM_OPTIONS = ["FRC", "Slingshot", "Hunga Munga", "Atlatl", "Kunai", "Westwood Overall"];
  let selectedTeam = $state("FRC");

  async function sync() {
    syncing = true;
    await dataService.load(true);
    syncing = false;
  }

  onMount(() => {
    dataService.load();
  });

  // ── Stats Calculations ──────────────────────────────────────────────────────
  
  // Use all requested orders for analytics 
  let teamOrders = $derived(
    selectedTeam === "Westwood Overall" 
      ? orders 
      : orders.filter((o) => {
          const t = (o.team || "").toLowerCase().trim();
          const s = selectedTeam.toLowerCase().trim();
          // Match exact, includes, or FRC specific (e.g., FRC matches 7117)
          return t === s || t.includes(s) || (s === "frc" && (t.includes("frc") || /^\d+$/.test(t)));
        })
  );

  let analyticsOrders = $derived(
    teamOrders
      .filter((/** @type {Order} */ o) => {
        if (selectedTeam !== "Westwood Overall") return true; // Show everything for individual teams
        const s = o.status?.toLowerCase().trim() || "";
        return s !== 'cancelled' && s !== 'denied';
      })
      .map((/** @type {Order} */ o) => ({
        ...o,
        month: (o.timestamp || "").toString().slice(0, 7), // "YYYY-MM"
      }))
  );

  // ── Stats Calculations (Split into individual runes for perfect reactivity) ──
  
  let totalSpent = $derived(analyticsOrders.reduce((sum, e) => sum + (e.total || 0), 0));
  let totalItems = $derived(analyticsOrders.length);
  let avgCost = $derived(analyticsOrders.length > 0 ? (totalSpent / analyticsOrders.length) : 0);
  
  let mostExpensive = $derived(analyticsOrders.length > 0 
    ? [...analyticsOrders].sort((a,b) => (b.total||0) - (a.total||0))[0] 
    : null
  );
  
  let topVendor = $derived.by(() => {
    if (analyticsOrders.length === 0) return null;
    /** @type {Record<string, number>} */
    const map = {};
    analyticsOrders.forEach((e) => {
      const comp = e.company || "Unknown";
      map[comp] = (map[comp] || 0) + 1;
    });
    const top = Object.entries(map).sort(([,a],[,b]) => b - a)[0];
    if (!top) return null;
    return { company: top[0], count: top[1] };
  });

  let byCategory = $derived.by(() => {
    /** @type {Record<string, number>} */
    const map = {};
    // Ensure all standard categories exist even if 0
    CATEGORIES.forEach(c => map[c] = 0);
    
    analyticsOrders.forEach((e) => {
      const cat = (e.category || "miscellaneous").toLowerCase().trim();
      if (map[cat] !== undefined) {
        map[cat] = (map[cat] || 0) + (e.total || 0);
      } else {
        map["miscellaneous"] = (map["miscellaneous"] || 0) + (e.total || 0);
      }
    });
    return map;
  });

  let monthlyTrends = $derived.by(() => {
    /** @type {Record<string, number>} */
    const map = {};
    analyticsOrders.forEach((e) => {
      if (e.month) {
        map[e.month] = (map[e.month] || 0) + (e.total || 0);
      }
    });
    return Object.entries(map)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a,b) => a.month.localeCompare(b.month));
  });
  
  let byVendorDollars = $derived.by(() => {
    /** @type {Record<string, number>} */
    const map = {};
    analyticsOrders.forEach((e) => {
      const vendor = e.company || "Unknown";
      map[vendor] = (map[vendor] || 0) + (e.total || 0);
    });
    // Sort and take top 8 for clarity
    return Object.fromEntries(
      Object.entries(map)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8)
    );
  });

  let statusDistribution = $derived.by(() => {
    /** @type {Record<string, number>} */
    const map = {};
    analyticsOrders.forEach((e) => {
      const status = e.status || "Unknown";
      map[status] = (map[status] || 0) + 1;
    });
    return map;
  });

</script>

<svelte:head>
  <title>Analytics — Westwood Finance</title>
</svelte:head>

<div class="page-header">
  <h1>Analytics <span>&amp; Stats</span></h1>
  <div style="display:flex;gap:10px;align-items:center">
    <div style="width: 170px;">
      <CustomDropdown options={TEAM_OPTIONS} bind:value={selectedTeam} />
    </div>
    <button class="btn btn-ghost btn-sm" onclick={sync} disabled={syncing}>
      <span class:spinning={syncing || (loading && !orders.length)}>↻</span> {syncing ? "Refreshing..." : "Refresh"}
    </button>
  </div>
</div>

{#if error}
  <div class="error-bar">⚠ {error}</div>
{/if}

{#if loading && !orders.length}
  <LoadingIndicator text="Analyzing financial data…" />
{:else if analyticsOrders.length > 0}
  <div class={!dataService.hasLoadedOnce ? "fade-in" : ""}>
    <div class="stat-grid" style="margin-bottom:28px">
      <StatCard label="Total Spent" value={totalSpent.toString()} isCurrency icon="$" />
      <StatCard label="Total Items" value={totalItems.toString()} icon="☰" accentColor="#4e9af1" />
      <StatCard label="Avg Cost / Item" value={avgCost.toString()} isCurrency icon="≈" accentColor="#6bcb77" />
      {#if mostExpensive}
        <StatCard label="Most Expensive" value={mostExpensive.total.toString()} isCurrency icon="↑" accentColor="#b97cf3" sub={mostExpensive.item} />
      {/if}
      {#if topVendor}
        <StatCard label="Top Vendor" value={topVendor.company} icon="" accentColor="#f1c84e" sub="{topVendor.count} orders" />
      {/if}
    </div>

    <div class="charts-grid" style="margin-top:24px">
      <div class="card chart-card">
        <h3 class="chart-title">Category Breakdown</h3>
        <div class="chart-container">
          <PieChart data={byCategory} />
        </div>
      </div>

      <div class="card chart-card">
        <h3 class="chart-title">Spending by Category</h3>
        <div class="chart-container">
          <BarChart data={byCategory} />
        </div>
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
          {#each Object.entries(byCategory).sort(([,a],[,b]) => b-a) as [cat, amt]}
            <tr>
              <td><span class="badge badge-{cat}">{cat.charAt(0).toUpperCase()+cat.slice(1)}</span></td>
              <td class="text-right monospace">{formatCurrency(amt)}</td>
              <td class="text-right text-muted">
                {totalSpent > 0 ? ((amt / totalSpent) * 100).toFixed(1) : '0.0'}%
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="charts-grid" style="margin-top:24px">
      <div class="card chart-card">
        <h3 class="chart-title">Top Vendors (By Spend)</h3>
        <div class="chart-container">
          <BarChart data={byVendorDollars} />
        </div>
      </div>

      <div class="card chart-card">
        <h3 class="chart-title">Order Status Distribution</h3>
        <div class="chart-container">
          <PieChart data={statusDistribution} colorMap={STATUS_COLORS} />
        </div>
      </div>

      <div class="card chart-card chart-wide">
        <h3 class="chart-title">Monthly Spending Trends</h3>
        {#if monthlyTrends.length > 0}
          <div class="chart-container-wide">
            <LineChart data={monthlyTrends} />
          </div>
        {:else}
          <div class="empty-state" style="padding:40px">No time data available yet</div>
        {/if}
      </div>
    </div>
  </div>
{:else}
  <div class="empty-state card">
    <div class="icon">📊</div>
    <h3>No analytical data found</h3>
    <p>Stats include all valid orders. Try selecting a different team or submit a new order to see stats.</p>
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
