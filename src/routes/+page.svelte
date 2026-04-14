<script>
  import { onMount } from "svelte";
  import StatCard from "$lib/components/StatCard.svelte";
  import ExpenseTable from "$lib/components/ExpenseTable.svelte";
  import { formatCurrency, formatDate } from "$lib/utils.js";

  // ── API Config ──────────────────────────────────────────────────────────────
  const BASE_URL =
    "https://script.google.com/macros/s/AKfycbxc8jeXwQ9FyFWIdhGmPZ7I674wt8wyjFkG1fdp0CP_AwLEJYXMdJcVgxAwu0YRQl3adA/exec";
  const SECRET_KEY = "YOUR_SECRET_KEY";

  // ── State ───────────────────────────────────────────────────────────────────
  /** @type {any[]} */
  let orders = $state([]);
  /** @type {any[]} */
  let funds = $state([]);
  /** @type {any} */
  let budget = $state(null);
  let loading = $state(true);
  let error = $state(/** @type {string|null} */ (null));
  let syncing = $state(false);

  async function loadAll() {
    loading = true;
    error = null;
    try {
      const [oRes, fRes, bRes] = await Promise.all([
        fetch(`${BASE_URL}?action=getOrders&key=${SECRET_KEY}`),
        fetch(`${BASE_URL}?action=getFunds&key=${SECRET_KEY}`),
        fetch(`${BASE_URL}?action=getBudget&key=${SECRET_KEY}`),
      ]);

      if (!oRes.ok || !fRes.ok || !bRes.ok) throw new Error("API Fetch Failed");

      orders = await oRes.json();
      funds = await fRes.json();
      budget = await bRes.json();
    } catch (e) {
      error = e instanceof Error ? e.message : "Data loading failed";
      console.error(e);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadAll();
  });

  async function sync() {
    syncing = true;
    await loadAll();
    syncing = false;
  }

  // ── Derived Derived Stats ───────────────────────────────────────────────────
  // "Expenses" are orders that have been received
  let expenses = $derived(
    orders
      .filter((o) => (o.Status ?? o.status) === "Received")
      .map((o) => ({
        ...o,
        total: Number(o.Total ?? o.total) || (Number(o.Price ?? o.price) * Number(o.Quantity ?? o.quantity)) || 0,
        category: (o.Category ?? o.category ?? "miscellaneous").toLowerCase(),
      })),
  );

  let totalRaised = $derived(
    funds.reduce((sum, f) => sum + (Number(f.Amount) || 0), 0),
  );

  let totalSpent = $derived(expenses.reduce((s, e) => s + (e.total || 0), 0));
  let netBalance = $derived(totalRaised - totalSpent);

  let recentExpenses = $derived(expenses.slice(-5).reverse());
  let recentOrders = $derived(orders.slice(-5).reverse());

  let budgetTotalValue = $derived(budget?.Total?.["Final"] || 0);
  let budgetRemaining = $derived(budgetTotalValue - totalSpent);

  // Category breakdown
  let spentByCategory = $derived(() => {
    const map = /** @type {Record<string,number>} */ ({});
    for (const e of expenses) {
      const cat = e.category || "miscellaneous";
      map[cat] = (map[cat] || 0) + (e.total || 0);
    }
    return map;
  });

  let topCat = $derived(() => {
    const data = spentByCategory();
    const sorted = Object.entries(data).sort(([, a], [, b]) => b - a);
    return sorted.length > 0 ? sorted[0] : null;
  });

  const CATEGORY_LABELS = /** @type {Record<string,string>} */ ({
    hardware: "Hardware",
    software: "Software",
    outreach: "Outreach",
    food: "Food",
    miscellaneous: "Misc",
  });
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
    <button class="btn btn-ghost btn-sm" onclick={sync} disabled={syncing}>
      <span class:spinning={syncing}>↻</span>
      {syncing ? "Syncing…" : "Refresh"}
    </button>
  </div>
</div>

{#if loading && !orders.length}
  <div class="empty-state">
    <div class="spinning" style="font-size:2rem;margin-bottom:16px">↻</div>
    Loading dashboard data…
  </div>
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
        <ExpenseTable expenses={recentExpenses} limit={5} />
      </section>

      <section class="dashboard-section card">
        <div class="section-header">
          <h2>Recent <span>Orders</span></h2>
          <a href="/orders" class="btn btn-ghost btn-xs">View All</a>
        </div>
        <div class="recent-list">
          {#each recentOrders as order}
            <div class="recent-item">
              <div class="item-info">
                <div class="item-name">{order.Item || order.item}</div>
                <div class="item-meta">
                  {order.Company || order.company} • {formatDate(
                    order.Timestamp || order.timestamp,
                  )}
                </div>
              </div>
              <div class="item-status">
                <span
                  class="status-pill"
                  data-status={order.Status || order.status}
                >
                  {order.Status || order.status}
                </span>
              </div>
              <div class="item-amount monospace">
                {formatCurrency(
                  Number(order.Total || order.total) ||
                    Number(order.Price || order.price) *
                      Number(order.Quantity || order.quantity),
                )}
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
          {#each Object.entries(spentByCategory()) as [cat, amount]}
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
        <p>Submit a request to the team for approval.</p>
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
    align-items: start;
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
    gap: 12px;
  }

  .recent-item {
    display: grid;
    grid-template-columns: 1fr auto 100px;
    gap: 12px;
    align-items: center;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
  }

  .recent-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .item-name {
    font-weight: 600;
    font-size: 0.95rem;
  }

  .item-meta {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .item-amount {
    text-align: right;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .status-pill {
    font-size: 0.7rem;
    padding: 2px 8px;
    border-radius: 99px;
    background: var(--surface-2);
    font-weight: 700;
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
</style>
