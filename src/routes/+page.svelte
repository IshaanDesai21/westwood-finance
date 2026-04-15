<script>
  import { onMount } from "svelte";
  import StatCard from "$lib/components/StatCard.svelte";
  import ExpenseTable from "$lib/components/ExpenseTable.svelte";
  import LoadingIndicator from "$lib/components/LoadingIndicator.svelte";
  import OrderStatusBadge from "$lib/components/OrderStatusBadge.svelte";
  import CustomDropdown from "$lib/components/CustomDropdown.svelte";
  import { formatCurrency, formatDate } from "$lib/utils.js";
  import { dataService } from "$lib/dataService.svelte.js";
  import appInfo from "$lib/app-info.json";

  /** @typedef {import('$lib/dataService.svelte.js').Order} Order */

  /** @type {{ orders: Order[], funds: any[], budget: any, loading: boolean, error: string|null }} */
  let { orders, funds, budget, loading, error } = $derived(dataService);
  let syncing = $state(false);

  const TEAM_OPTIONS = ["FRC", "Slingshot", "Hunga Munga", "AtlAtl", "Kunai", "Westwood Overall"];
  let selectedTeam = $state("FRC");

  // ── Derived View Based on Team ─────────────────────────────────────────────
  let teamOrders = $derived(
    selectedTeam === "Westwood Overall" 
      ? orders 
      : orders.filter((o) => (o.team || "").toLowerCase().includes(selectedTeam.toLowerCase()))
  );

  let teamFunds = $derived(
    selectedTeam === "Westwood Overall"
      ? funds
      : funds.filter((f) => (f.Recipient || "").toLowerCase().includes(selectedTeam.toLowerCase()))
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
    teamOrders
      .filter((/** @type {Order} */ o) => {
        const s = (o.status || "").toLowerCase().trim();
        return s === "received" || s === "ordered";
      })
  );

  let totalRaised = $derived(
    teamFunds.reduce((/** @type {number} */ sum, /** @type {any} */ f) => sum + (Number(f.Amount) || 0), 0),
  );

  let totalSpent = $derived(expenses.reduce((/** @type {number} */ s, /** @type {Order} */ e) => s + (e.total || 0), 0));
  let netBalance = $derived(totalRaised - totalSpent);

  let recentExpenses = $derived(expenses.slice(-5).reverse());
  let recentOrders = $derived(teamOrders.slice(-5).reverse());

  let budgetTotalValue = $derived(budget?.Total?.["Final"] || 0);

  // Category breakdown
  let spentByCategory = $derived.by(() => {
    const map = /** @type {Record<string,number>} */ ({});
    for (const e of expenses) {
      const cat = e.category || "miscellaneous";
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
  <h1>Dashboard <span>Overview</span></h1>
  <div style="display:flex;gap:10px;align-items:center">
    {#if error}
      <span class="error-text" style="font-size:0.85rem">⚠ {error}</span>
    {/if}
    <div class="deploy-info">
      <span class="version-tag">v{appInfo.version}</span>
      <span class="deploy-time">{appInfo.deployedAt}</span>
    </div>
    
    <div style="width: 170px;">
      <CustomDropdown options={TEAM_OPTIONS} bind:value={selectedTeam} />
    </div>
    <button class="btn btn-ghost btn-sm" onclick={sync} disabled={syncing}>
      <span class:spinning={syncing}>↻</span>
      {syncing ? "Syncing…" : "Refresh"}
    </button>
  </div>
</div>

<!-- Only show full loading screen if we have absolutely NO data (first visit ever) -->
{#if loading && !orders.length && !funds.length}
  <LoadingIndicator text="Initial data fetch..." />
{:else}
  <div class="stat-grid fade-in">
    <StatCard
      label="Net Balance"
      value={formatCurrency(netBalance)}
      sub="Total Raised - Spent"
      accentColor={netBalance >= 0 ? "#6bcb77" : "#f16a4e"}
    />
    <StatCard
      label="Total Raised"
      value={formatCurrency(totalRaised)}
      sub={`${funds.length} contributions`}
      accentColor="var(--primary)"
    />
    <StatCard
      label="Total Expenses"
      value={formatCurrency(totalSpent)}
      sub={`${expenses.length} fulfilled orders`}
      accentColor="#f16a4e"
    />
    <StatCard
      label="Budget Progress"
      value={budgetTotalValue > 0
        ? Math.min(100, (totalSpent / budgetTotalValue) * 100).toFixed(1) + "%"
        : "—"}
      sub={budgetTotalValue > 0
        ? `${formatCurrency(totalSpent)} / ${formatCurrency(budgetTotalValue)}`
        : "No budget set"}
      accentColor="#b97cf3"
    />
  </div>

  <div class="dashboard-content fade-in">
    <div class="main-column">
      <section class="dashboard-section card">
        <div class="section-header">
          <h2>Recent <span>Expenses</span></h2>
          <a href="/orders" class="btn btn-ghost btn-xs">View All</a>
        </div>
        <ExpenseTable expenses={recentExpenses} limit={5} hideTeam={selectedTeam !== "Westwood Overall"} />
      </section>

      <section class="dashboard-section card">
        <div class="section-header">
          <h2>Recent <span>Orders</span></h2>
          <a href="/orders" class="btn btn-ghost btn-xs">View All</a>
        </div>
        <div class="recent-list">
          {#each recentOrders as order (order.id)}
            {@const orderColor = getOrderColor(order.orderUUID)}
            <div 
              class="recent-item group-row" 
              style="--group-color: {orderColor}"
              role="button" 
              tabindex="0" 
              onclick={() => console.log('Recent Order Data:', order)} 
              onkeydown={(e) => {if(e.key==='Enter' || e.key===' ') console.log('Recent Order Data:', order)}}
              aria-label="Order detail for {order.item}"
            >
              <div class="item-info">
                <div class="item-name">{order.item}</div>
                <div class="item-meta">
                  {order.company} • {formatDate(order.timestamp)}
                </div>
              </div>
              <div class="item-status">
                <OrderStatusBadge status={order.status} />
              </div>
              <div class="item-amount monospace">
                {formatCurrency(order.total)}
              </div>
            </div>
          {:else}
            <div class="empty-text">No orders yet</div>
          {/each}
        </div>
      </section>
    </div>

    <aside class="side-column">
      <section class="dashboard-section card">
        <h2>Spending <span>Breakdown</span></h2>
        <div class="category-list">
          {#each Object.entries(spentByCategory) as [cat, amount]}
            {@const pct = totalSpent > 0 ? (amount / totalSpent) * 100 : 0}
            <div class="cat-row">
              <div class="cat-info">
                <span class="cat-label"
                  >{CATEGORY_LABELS[cat] || cat.toUpperCase()}</span
                >
                <span class="cat-amount">{formatCurrency(amount)}</span>
              </div>
              <div class="cat-bar-track">
                <div
                  class="cat-bar-fill"
                  style="width: {pct}%; background: var(--cat-{cat}, #8a8a8a)"
                ></div>
              </div>
            </div>
          {:else}
            <div class="empty-text">No expenses tracked</div>
          {/each}
        </div>
      </section>

      <section class="dashboard-section card promo-card">
        <h3>Need to <span>Order?</span></h3>
        <p>Submit a request for approval.</p>
        <a href="/add" class="btn btn-primary btn-sm" style="margin-top:10px"
          >+ New Request</a
        >
      </section>
    </aside>
  </div>
{/if}

<style>
  .stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
  }

  .dashboard-content {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 24px;
  }

  @media (max-width: 900px) {
    .dashboard-content {
      grid-template-columns: 1fr;
    }
  }

  .main-column {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .side-column {
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .dashboard-section {
    padding: 24px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 20px;
  }

  .section-header h2 {
    margin: 0;
  }

  /* Recent Orders List */
  .recent-list {
    display: flex;
    flex-direction: column;
    gap: 1px; /* Minimal gap for continuous line look */
    background: var(--border); /* Optional: creates a thin separator */
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .recent-item {
    display: grid;
    grid-template-columns: 1fr auto 100px;
    gap: 12px;
    align-items: center;
    padding: 12px 16px 12px 24px;
    background: var(--surface);
    transition: background 0.2s;
    cursor: pointer;
    position: relative;
  }

  /* Group Indicator Line (Full Height, No Glow) */
  .recent-item::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 5px;
    background: var(--group-color);
    opacity: 0.9;
  }

  .recent-item:hover {
    background: var(--surface-2);
  }

  .item-name {
    font-weight: 600;
    font-size: 0.95rem;
  }

  .item-meta {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .item-status {
    font-size: 0.82rem;
    font-weight: 500;
  }

  .item-amount {
    text-align: right;
    font-weight: 600;
    font-size: 0.9rem;
  }

  /* Category List */
  .category-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 16px;
  }

  .cat-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .cat-info {
    display: flex;
    justify-content: space-between;
    font-size: 0.82rem;
    font-weight: 600;
  }

  .cat-bar-track {
    height: 6px;
    background: var(--surface-2);
    border-radius: 99px;
    overflow: hidden;
  }

  .cat-bar-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.4s ease;
  }

  .promo-card {
    background: linear-gradient(
      135deg,
      rgba(107, 123, 243, 0.1) 0%,
      rgba(185, 124, 243, 0.1) 100%
    );
    border: 1px solid rgba(107, 123, 243, 0.2);
    text-align: center;
  }

  .empty-text {
    text-align: center;
    padding: 20px;
    background: var(--surface);
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .error-text {
    color: #f16a4e;
    font-weight: 500;
  }

  .btn-xs {
    font-size: 0.7rem;
    padding: 4px 8px;
  }

  /* Deploy Info Styling */
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

  .version-tag {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text);
  }

  .deploy-time {
    font-size: 0.65rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }

  @media (max-width: 600px) {
    .deploy-info {
      display: none;
    }
  }

  @media (max-width: 900px) {
    .dashboard-content {
      grid-template-columns: 1fr;
    }
  }
  
</style>
