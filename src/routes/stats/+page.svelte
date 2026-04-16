<script>
  import { onMount } from 'svelte';
  import StatCard from '$lib/components/StatCard.svelte';
  import PieChart from '$lib/components/PieChart.svelte';
  import LineChart from '$lib/components/LineChart.svelte';
  import BarChart from '$lib/components/BarChart.svelte';
  import LoadingIndicator from '$lib/components/LoadingIndicator.svelte';
  import CustomDropdown from '$lib/components/CustomDropdown.svelte';
  import { formatCurrency, formatDate, CATEGORIES, STATUS_COLORS, truncate } from "$lib/utils.js";
  import { dataService } from '$lib/dataService.svelte.js';

  /** @typedef {import('$lib/dataService.svelte.js').Order} Order */

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
      ? dataService.orders 
      : dataService.orders.filter((o) => {
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
  <div class="header-left">
    <h1>Spending <span>Trends</span></h1>
    <p class="text-muted">Visual history of team purchases and classification</p>
  </div>
  
  <div class="header-right">
    {#if dataService.error}
       <span class="error-text">⚠ {dataService.error}</span>
    {/if}

    <div class="team-selector">
      <CustomDropdown options={TEAM_OPTIONS} bind:value={selectedTeam} />
    </div>
    
    <button class="btn btn-ghost btn-sm" onclick={sync} disabled={syncing}>
      <span class:spinning={syncing || (dataService.loading && !dataService.orders.length)}>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
      </span>
      {syncing ? "Analyzing" : "Refresh"}
    </button>
  </div>
</div>

{#if dataService.loading && !dataService.orders.length}
  <LoadingIndicator text="Analyzing ledger data..." />
{:else if analyticsOrders.length > 0}
  <div class={!dataService.hasLoadedOnce ? "fade-in" : ""}>
    <div class="stat-grid" style="margin-bottom: 32px">
      <StatCard 
        label="Total Spend" 
        value={totalSpent.toString()} 
        isCurrency={true}
        accentColor="var(--status-rejected)"
        icon='<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M12 2v20m-5-17h10a4 4 0 1 1 0 8H7a4 4 0 1 0 0 8h10"/></svg>'
      />
      <StatCard 
        label="Request Count" 
        value={totalItems.toString()} 
        sub="Approved entries"
        accentColor="var(--status-ordered)"
        icon='<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>'
      />
      <StatCard 
        label="Average Spend" 
        value={avgCost.toString()} 
        isCurrency={true}
        accentColor="var(--status-rejected)"
        icon='<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M12 2v20m-5-17h10a4 4 0 1 1 0 8H7a4 4 0 1 0 0 8h10"/></svg>'
      />
    </div>

    <div class="charts-grid">
      <div class="card chart-card">
        <div class="card-header-group">
          <h3 class="chart-title">Category Distribution</h3>
          <p class="chart-subtitle">By total volume</p>
        </div>
        <div class="chart-container">
          <PieChart data={byCategory} />
        </div>
      </div>

      <div class="card chart-card">
        <div class="card-header-group">
          <h3 class="chart-title">Spend Allocation</h3>
          <p class="chart-subtitle">By project category</p>
        </div>
        <div class="chart-container">
          <BarChart data={byCategory} />
        </div>
      </div>
    </div>

    <div class="card stats-table-card" style="margin-top: 24px; padding: 0; overflow: hidden;">
      <div class="card-table-header">
        <div class="card-header-group">
          <h3 style="margin: 0; font-size: 1.1rem;">Category <span>Totals</span></h3>
          <p class="chart-subtitle">Money spent by each category</p>
        </div>
      </div>
      <div class="table-wrap" style="border: none; border-radius: 0; margin-bottom: 0;">
        <table>
          <thead>
            <tr>
              <th style="padding-left: 24px;">Classification</th>
              <th class="text-right">Total Invested</th>
              <th class="text-right" style="padding-right: 24px;">Budget Percentage</th>
            </tr>
          </thead>
          <tbody>
            {#each Object.entries(byCategory).sort(([,a],[,b]) => b-a) as [cat, amt]}
              <tr>
                <td style="padding-left: 24px;">
                  <span class="badge badge-{cat}" style="font-weight: 700; font-size: 0.65rem;">
                    {cat.toUpperCase()}
                  </span>
                </td>
                <td class="text-right monospace amount">{formatCurrency(amt)}</td>
                <td class="text-right text-dim monospace" style="padding-right: 24px;">
                  {totalSpent > 0 ? ((amt / totalSpent) * 100).toFixed(1) : '0.0'}%
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    <div class="charts-grid" style="margin-top: 24px">
      <div class="card chart-card">
        <div class="card-header-group">
          <h3 class="chart-title">Status Distribution</h3>
          <p class="chart-subtitle">Request overview</p>
        </div>
        <div class="chart-container">
          <PieChart data={statusDistribution} colorMap={STATUS_COLORS} />
        </div>
      </div>

      <div class="card chart-card">
        <div class="card-header-group">
          <h3 class="chart-title">Monthly Trends</h3>
          <p class="chart-subtitle">Spending over time</p>
        </div>
        {#if monthlyTrends.length > 0}
          <div class="chart-container">
            <LineChart data={monthlyTrends} />
          </div>
        {:else}
          <div class="empty-state" style="padding: 48px">No historical data recorded yet</div>
        {/if}
      </div>
    </div>
  </div>
{:else}
  <div class="empty-state card fade-in">
    <div class="icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
    </div>
    <h3>No analytical insights</h3>
    <p>History will populate once requests are recorded.</p>
  </div>
{/if}

<style>
  .header-right { display: flex; gap: 12px; align-items: center; }
  .team-selector { width: 170px; }
  
  .stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 20px;
  }

  .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .chart-wide  { grid-column: 1 / -1; }
  .chart-card  { padding: 24px; display: flex; flex-direction: column; }
  
  .card-header-group { margin-bottom: 24px; }
  .chart-title { font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #fff; margin-bottom: 4px; }
  .chart-subtitle { font-size: 0.75rem; color: var(--text-dim); font-weight: 500; }
  
  .card-table-header { padding: 24px 24px 0 24px; }

  .chart-container { height: 260px; width: 100%; position: relative; }
  .chart-container-wide { height: 340px; width: 100%; position: relative; padding: 20px 0; }

  .amount { font-weight: 700; color: #fff; }
  
  .error-text { color: var(--status-rejected); font-size: 0.8rem; font-weight: 600; margin-right: 12px; }

  @media (max-width: 1000px) { 
    .charts-grid { grid-template-columns: 1fr; } 
    .chart-wide { grid-column: 1; } 
  }
</style>
