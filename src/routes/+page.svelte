<script>
  import { onMount } from "svelte";
  import StatCard from "$lib/components/StatCard.svelte";
  import ExpenseTable from "$lib/components/ExpenseTable.svelte";
  import LoadingIndicator from "$lib/components/LoadingIndicator.svelte";
  import OrderStatusBadge from "$lib/components/OrderStatusBadge.svelte";
  import CustomDropdown from "$lib/components/CustomDropdown.svelte";
  import { formatCurrency, formatDate, CATEGORIES } from "$lib/utils.js";
  import { dataService } from "$lib/dataService.svelte.js";
  import appInfo from "$lib/app-info.json";

  /** @typedef {import('$lib/dataService.svelte.js').Order} Order */

  let syncing = $state(false);

  const TEAM_OPTIONS = [
    "FRC",
    "Slingshot",
    "Hunga Munga",
    "AtlAtl",
    "Kunai",
    "Westwood Overall",
  ];
  let selectedTeam = $state("FRC");

  // ── Derived View Based on Team ─────────────────────────────────────────────
  let teamOrders = $derived(
    selectedTeam === "Westwood Overall"
      ? dataService.orders
      : dataService.orders.filter((o) =>
          String(o.team || "").toLowerCase().includes(selectedTeam.toLowerCase()),
        ),
  );

  let teamFunds = $derived(
    selectedTeam === "Westwood Overall"
      ? dataService.funds
      : dataService.funds.filter((f) => {
          const r = String(f.Recipient || "").toLowerCase().trim();
          const s = selectedTeam.toLowerCase().trim();
          return r === s || r.includes(s) || r === "all";
        }),
  );

  async function sync() {
    syncing = true;
    await dataService.load(true); // force refresh
    syncing = false;
  }

  onMount(() => {
    dataService.load(); // uses cache if available
  });

  // ── Derived Stats ───────────────────────────────────────────────────────────
  // "Expenses" are orders that have been received or ordered
  let expenses = $derived(
    teamOrders.filter((/** @type {Order} */ o) => {
      const s = (o.status || "").toLowerCase().trim();
      return s === "received" || s === "ordered";
    }),
  );

  let totalRaised = $derived(
    teamFunds.reduce(
      (/** @type {number} */ sum, /** @type {any} */ f) =>
        sum + (Number(f.Amount) || 0),
      0,
    ),
  );

  let totalSpent = $derived(
    expenses.reduce(
      (/** @type {number} */ s, /** @type {Order} */ e) => s + (e.total || 0),
      0,
    ),
  );
  let netBalance = $derived(totalRaised - totalSpent);

  let recentExpenses = $derived(expenses.slice(-5).reverse());
  let recentOrders = $derived(teamOrders.slice(-5).reverse());

  let budgetTotalValue = $derived(dataService.budget?.Total?.["Final"] || 0);

  // Category breakdown
  let spentByCategory = $derived.by(() => {
    const map = /** @type {Record<string,number>} */ ({});
    CATEGORIES.forEach((c) => (map[c] = 0));
    for (const e of expenses) {
      const cat = (e.category || "miscellaneous").toLowerCase().trim();
      map[cat] = (map[cat] || 0) + (e.total || 0);
    }
    return map;
  });

  const CATEGORY_LABELS = /** @type {Record<string,string>} */ ({
    hardware: "Hardware",
    software: "Software",
    outreach: "Outreach",
    food: "Food",
    miscellaneous: "Misc",
  });
  // Generate a stable hue from an order UUID
  function getOrderColor(/** @type {string|undefined} */ uuid) {
    if (!uuid) return "transparent";
    let hash = 0;
    for (let i = 0; i < uuid.length; i++) {
      hash = uuid.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 65%, 45%)`;
  }
</script>

<svelte:head>
  <title>Dashboard — Westwood Finance</title>
</svelte:head>

<div class="page-header">
  <div class="header-left">
    <h1>Dashboard</h1>
    <p class="text-muted">Westwood Robotics Financial Overview</p>
  </div>
  
  <div class="header-right">
    {#if dataService.error}
      <span class="error-text">⚠ {dataService.error}</span>
    {/if}
    <div class="deploy-info">
      <span class="version-tag">v{appInfo.version}</span>
      <span class="deploy-time">{appInfo.deployedAt}</span>
    </div>

    <div class="team-selector">
      <CustomDropdown options={TEAM_OPTIONS} bind:value={selectedTeam} />
    </div>
    
    <button class="btn btn-ghost btn-sm" onclick={sync} disabled={syncing}>
      <span class:spinning={syncing}>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
      </span>
      {syncing ? "Syncing" : "Refresh"}
    </button>
  </div>
</div>

{#if dataService.loading && !dataService.orders.length && !dataService.funds.length}
  <LoadingIndicator text="Initializing workspace..." />
{:else}
  <div class="stat-grid fade-in">
    <StatCard
      label="Net Balance"
      value={netBalance.toString()}
      isCurrency={true}
      sub="Total Raised - Total Spent"
      accentColor={netBalance >= 0 ? "var(--status-awarded)" : "var(--status-rejected)"}
      icon='<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 2v20m-5-17h10a4 4 0 1 1 0 8H7a4 4 0 1 0 0 8h10"/></svg>'
    />
    <StatCard
      label="Total Raised"
      value={totalRaised.toString()}
      isCurrency={true}
      sub={`${dataService.funds.length} contributions`}
      accentColor="var(--status-awarded)"
      icon='<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><m12 19 7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="m2 2 20 20"/><path d="m8 8 4 4"/></svg>'
    />
    <StatCard
      label="Total Spent"
      value={totalSpent.toString()}
      isCurrency={true}
      sub={`${expenses.length} fulfilled requests`}
      accentColor="var(--status-rejected)"
      icon='<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>'
    />
    <StatCard
      label="Budget Progress"
      value={budgetTotalValue > 0 ? Math.round((totalSpent / budgetTotalValue) * 100).toString() : "0"}
      progress={budgetTotalValue > 0 ? (totalSpent / budgetTotalValue) * 100 : 0}
      progressLabel={budgetTotalValue > 0 ? `${Math.round((totalSpent / budgetTotalValue) * 100)}%` : "N/A"}
      sub={budgetTotalValue > 0
        ? `${formatCurrency(totalSpent)} of ${formatCurrency(budgetTotalValue)}`
        : "No active budget"}
      accentColor="var(--cat-miscellaneous)"
      icon='<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 20v-6M6 20V10M18 20V4"/></svg>'
    />
  </div>

  <div class="dashboard-content fade-in">
    <div class="main-column">
      <section class="card">
        <div class="section-header">
          <div class="section-title-group">
            <h2>Recent <span>Expenses</span></h2>
            <p class="section-subtitle">Purchases history</p>
          </div>
          <a href="/orders" class="btn btn-ghost btn-xs">View History</a>
        </div>
        <div class="table-container">
          <ExpenseTable
            expenses={recentExpenses}
            limit={5}
            hideTeam={selectedTeam !== "Westwood Overall"}
          />
        </div>
      </section>
    </div>

    <aside class="side-column">
      <section class="card">
        <div class="section-header">
          <div class="section-title-group">
            <h2 style="font-size: 1.1rem">Recent <span>Orders</span></h2>
            <p class="section-subtitle">Latest purchase status</p>
          </div>
          <a href="/orders" class="btn btn-ghost btn-xs">Track</a>
        </div>
        <div class="recent-list">
          {#each recentOrders as order (order.id)}
            {@const orderColor = getOrderColor(order.orderUUID)}
            <div
              class="recent-item group-row"
              style="--group-color: {orderColor}"
            >
              <div class="item-info">
                <div class="item-name" style="font-size: 0.85rem;">{order.item}</div>
                <div class="item-meta">
                  <span class="company">{order.company}</span>
                  <span class="dot"></span>
                  <span class="date">{formatDate(order.timestamp)}</span>
                </div>
              </div>
              <div class="item-status">
                <OrderStatusBadge status={order.status} />
              </div>
              <div class="item-amount monospace amount" style="font-size: 0.85rem;">
                {formatCurrency(order.total)}
              </div>
            </div>
          {:else}
            <div class="empty-state">No active orders</div>
          {/each}
        </div>
      </section>

      <section class="card">
        <div class="section-title-group" style="margin-bottom: 24px;">
           <h2 style="font-size: 1.1rem">Spending <span>Breakdown</span></h2>
           <p class="section-subtitle">By category</p>
        </div>
        <div class="category-list">
          {#each Object.entries(spentByCategory) as [cat, amount]}
            {@const pct = totalSpent > 0 ? (amount / totalSpent) * 100 : 0}
            <div class="cat-row">
              <div class="cat-info">
                <span class="cat-label">{CATEGORY_LABELS[cat] || cat.toUpperCase()}</span>
                <span class="cat-amount">{formatCurrency(amount)}</span>
              </div>
              <div class="cat-bar-track">
                <div
                  class="cat-bar-fill"
                  style="width: {pct}%; background: var(--cat-{cat}, #8a8a8a)"
                ></div>
                <div class="cat-bar-glow" style="background: var(--cat-{cat}, #8a8a8a); width: {pct}%"></div>
              </div>
            </div>
          {:else}
            <div class="empty-state small">No data yet</div>
          {/each}
        </div>
      </section>

    </aside>
  </div>
{/if}

<style>
  .header-left h1 { margin-bottom: 2px; }
  .header-right { display: flex; gap: 12px; align-items: center; }
  
  .team-selector { width: 170px; }
  
  .stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 24px;
    margin-bottom: 40px;
  }

  .dashboard-content {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 24px;
    align-items: start;
  }

  @media (max-width: 1100px) {
    .dashboard-content { grid-template-columns: 1fr; }
  }

  .main-column {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .side-column {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;
  }
  
  .section-title-group h2 { font-size: 1.25rem; font-weight: 700; color: #fff; margin-bottom: 2px; }
  .section-subtitle { font-size: 0.8rem; color: var(--text-muted); font-weight: 500; }

  /* Recent Orders List */
  .recent-list {
    display: flex;
    flex-direction: column;
    gap: 1px;
    background: var(--border);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .recent-item {
    display: grid;
    grid-template-columns: 1fr auto 90px;
    gap: 12px;
    align-items: center;
    padding: 12px 14px 12px 18px;
    background: var(--surface);
    transition: all 0.2s;
    position: relative;
  }

  .recent-item::before {
    content: "";
    position: absolute;
    left: 0;
    top: 6px;
    bottom: 6px;
    width: 3px;
    background: var(--group-color);
    border-radius: 99px;
    opacity: 0.8;
  }

  .recent-item:hover {
    background: var(--surface-2);
  }

  .item-name { font-weight: 600; font-size: 0.95rem; color: #fff; }
  .item-meta { display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: var(--text-dim); font-weight: 500; }
  .item-meta .dot { width: 3px; height: 3px; background: var(--text-dim); border-radius: 50%; }

  .amount { text-align: right; font-weight: 700; color: #fff; font-size: 0.95rem; }

  /* Category List */
  .category-list { display: flex; flex-direction: column; gap: 20px; }
  .cat-row { display: flex; flex-direction: column; gap: 8px; }
  .cat-info { display: flex; justify-content: space-between; font-size: 0.825rem; font-weight: 700; }
  .cat-label { color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .cat-amount { color: #fff; }

  .cat-bar-track { height: 6px; background: var(--surface-3); border-radius: 99px; overflow: hidden; position: relative; }
  .cat-bar-fill { height: 100%; border-radius: 99px; transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1); position: relative; z-index: 2; }
  .cat-bar-glow { position: absolute; top: 0; left: 0; height: 100%; opacity: 0.15; filter: blur(4px); z-index: 1; }

  .btn-xs { font-size: 0.7rem; padding: 4px 10px; }
  .btn-xs { font-size: 0.7rem; padding: 4px 10px; }

  .deploy-info {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    margin-right: 8px;
    padding-right: 12px;
    border-right: 1px solid var(--border);
    line-height: 1;
  }

  .version-tag { font-size: 0.75rem; font-weight: 700; color: #fff; }
  .deploy-time { font-size: 0.6rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }

  .error-text { color: var(--status-rejected); font-size: 0.8rem; font-weight: 600; }

  @media (max-width: 650px) {
    .header-right .deploy-info { display: none; }
  }
</style>
