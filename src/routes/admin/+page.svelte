<script>
  import { onMount } from "svelte";
  import OrderStatusBadge from "$lib/components/OrderStatusBadge.svelte";
  import CustomDropdown from "$lib/components/CustomDropdown.svelte";
  import {
    orders,
    loading,
    error,
    loadOrders,
    updateOrderStatus,
  } from "$lib/stores/orders.js";
  import {
    budgetCategories,
    budgetTotal,
    budgetLoading,
    budgetError,
    loadBudget,
    saveBudget,
  } from "$lib/stores/budget.js";
  import { api } from "$lib/api.js";
  import { formatCurrency, formatDate } from "$lib/utils.js";

  const ORDER_STATUSES = ["Submitted and in review", "Ordered", "Received"];
  const CATEGORIES = [
    "hardware",
    "software",
    "outreach",
    "food",
    "miscellaneous",
  ];

  const CATEGORY_META =
    /** @type {Record<string, {label:string, color:string, icon:string}>} */ ({
      hardware: { label: "Hardware", color: "var(--cat-hardware)", icon: "🔧" },
      software: { label: "Software", color: "var(--cat-software)", icon: "💻" },
      outreach: { label: "Outreach", color: "var(--cat-outreach)", icon: "🤝" },
      food: { label: "Food", color: "#f1a94e", icon: "🍕" },
      miscellaneous: {
        label: "Miscellaneous",
        color: "var(--cat-miscellaneous)",
        icon: "📦",
      },
    });

  let unlocked = $state(false);
  let passwordInput = $state("");
  let authError = $state("");
  let currentPassword = "";

  let updatingRow = $state(/** @type {number|null} */ (null));
  let actionMsg = $state("");
  let actionErr = $state("");

  // Per-order state for status and tracking inputs
  /** @type {Record<number, { status: string, tracking: string, saving: boolean, addingExpense: boolean }>} */
  let orderState = $state({});

  // Local editable copy of budgets
  /** @type {Record<string,number>} */
  let draftBudgets = $state({});
  let savingBudget = $state(false);
  let saveMsg = $state("");
  let saveErr = $state("");

  onMount(async () => {
    loadOrders(true);
    await loadBudget();
    resetDraft();
  });

  function resetDraft() {
    draftBudgets = { ...$budgetCategories };
  }

  async function tryUnlock() {
    if (passwordInput === "/dev3432") {
      unlocked = true;
      authError = "";
      currentPassword = passwordInput;
      passwordInput = "";
    } else {
      authError = "Incorrect password. Please try again.";
      passwordInput = "";
    }
  }

  // Initialize per-order state from loaded orders
  let inProgressOrders = $derived(
    $orders.filter((o) => o.status !== "Received"),
  );

  function getState(/** @type {any} */ order) {
    if (!orderState[order.id]) {
      orderState[order.id] = {
        status: order.status || "Submitted and in review",
        tracking: order.tracking || "",
        saving: false,
        addingExpense: false,
      };
    }
    return orderState[order.id];
  }

  async function saveStatus(/** @type {any} */ order) {
    const st = getState(order);
    st.saving = true;
    actionErr = "";
    actionMsg = "";
    try {
      await updateOrderStatus(order.rowIndex, st.status, st.tracking);
      actionMsg = `✓ Status updated for "${order.item}"`;
    } catch (e) {
      actionErr = /** @type {any} */ (e)?.message || String(e);
    } finally {
      st.saving = false;
    }
  }

  async function promoteToExpense(/** @type {any} */ order) {
    const st = getState(order);
    if (!confirm(`Add "${order.item}" as an expense and mark as Received?`))
      return;
    st.addingExpense = true;
    actionErr = "";
    actionMsg = "";
    try {
      // Add to expenses
      await api.expenses.create({
        item: order.item,
        company: order.company,
        link: order.link,
        price: order.price,
        quantity: order.quantity,
        notes: order.notes,
        category: CATEGORIES.includes(order.category)
          ? order.category
          : "miscellaneous",
        user: order.user,
      });
      // Update order status to Received
      await updateOrderStatus(order.rowIndex, "Received", st.tracking);
      actionMsg = `✓ "${order.item}" added as an expense and marked Received!`;
    } catch (e) {
      actionErr = /** @type {any} */ (e)?.message || String(e);
    } finally {
      st.addingExpense = false;
    }
  }

  async function handleSaveBudget() {
    savingBudget = true;
    saveMsg = "";
    saveErr = "";
    try {
      await saveBudget(draftBudgets, currentPassword);
      saveMsg = "✓ Budget saved successfully!";
    } catch (/** @type {any} */ e) {
      saveErr = e?.message || String(e);
    } finally {
      savingBudget = false;
    }
  }

  let draftTotal = $derived(
    Object.values(draftBudgets).reduce((s, v) => s + (Number(v) || 0), 0),
  );
</script>

<svelte:head>
  <title>Admin Dashboard — Westwood Finance</title>
</svelte:head>

{#if !unlocked}
  <!-- ── Lock Screen ──────────────────────────────────────────────────────── -->
  <div class="lock-screen">
    <div class="lock-card">
      <div class="lock-icon">🔐</div>
      <h1>Admin Console Access</h1>
      <p class="text-muted" style="margin-bottom:24px;font-size:0.9rem">
        Enter the admin password to access advanced modules.
      </p>
      {#if authError}
        <div class="error-bar" style="margin-bottom:16px">{authError}</div>
      {/if}
      <form
        onsubmit={(e) => {
          e.preventDefault();
          tryUnlock();
        }}
        id="admin-login-form"
      >
        <div class="form-group" style="margin-bottom:16px">
          <label for="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            bind:value={passwordInput}
            placeholder="Enter admin password"
            autocomplete="current-password"
          />
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%"
          >Unlock</button
        >
      </form>
    </div>
  </div>
{:else}
  <!-- ── Admin Panel ──────────────────────────────────────────────────────── -->
  <div class="page-header">
    <h1>Admin <span>Console</span></h1>
    <div style="display:flex;gap:8px;align-items:center">
      <span class="unlocked-badge">🔓 Unlocked</span>
      <button class="btn btn-ghost btn-sm" onclick={() => { loadOrders(true); loadBudget(); }}>
        <span>↻</span> Refresh All
      </button>
    </div>
  </div>

  <div class="admin-sections">
    <!-- ── ORDER MANAGEMENT ─────────────────────────────────────────────── -->
    <section class="admin-section">
      <h2>Order Management</h2>
      <p class="text-muted" style="margin-bottom:16px;font-size:0.9rem">Update statuses for pending orders.</p>

      {#if actionErr}
        <div class="error-bar">{actionErr}</div>
      {/if}
      {#if actionMsg}
        <div class="success-bar">{actionMsg}</div>
      {/if}

      {#if $loading}
        <div class="empty-state">
          <span class="spinning">↻</span> Loading orders…
        </div>
      {:else if inProgressOrders.length === 0}
        <div class="empty-state card">
          <div class="icon">✅</div>
          All orders have been received! No pending orders.
        </div>
      {:else}
        <div class="section-title">
          In-Progress Orders ({inProgressOrders.length})
        </div>

        <div class="orders-list">
          {#each inProgressOrders as order (order.id)}
            {@const st = getState(order)}
            <div class="order-card card fade-in">
              <div class="order-header">
                <div class="order-info">
                  <div class="order-name">
                    {#if order.link}
                      <a href={order.link} target="_blank" rel="noopener">{order.item}</a>
                    {:else}
                      {order.item}
                    {/if}
                  </div>
                  <div class="order-meta">
                    {#if order.company}<span class="meta-chip">🏢 {order.company}</span>{/if}
                    <span class="meta-chip">📂 {order.category}</span>
                    <span class="meta-chip">👤 {order.user || "—"}</span>
                    <span class="meta-chip monospace">{formatCurrency(order.total)}</span>
                    {#if order.timestamp}<span class="meta-chip text-muted">{order.timestamp?.slice(0, 10)}</span>{/if}
                  </div>
                  {#if order.notes}
                    <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px">
                      {order.notes}
                    </div>
                  {/if}
                </div>
                <div class="current-status">
                  <OrderStatusBadge status={order.status || "Submitted and in review"} />
                </div>
              </div>

              <div class="order-controls">
                <div class="control-row">
                  <div class="form-group" style="flex:1;min-width:200px">
                    <label for="status-{order.id}">Change Status</label>
                    <CustomDropdown 
                      options={ORDER_STATUSES} 
                      bind:value={st.status} 
                    />
                  </div>

                  {#if st.status === "Ordered"}
                    <div class="form-group" style="flex:2;min-width:200px">
                      <label for="tracking-{order.id}">Tracking Info <span class="text-muted">(optional)</span></label>
                      <input id="tracking-{order.id}" type="text" bind:value={st.tracking} placeholder="Tracking number or link" />
                    </div>
                  {/if}
                </div>

                <div class="action-row">
                  <button class="btn btn-primary btn-sm" onclick={() => saveStatus(order)} disabled={st.saving}>
                    {st.saving ? "Saving…" : "Update Status"}
                  </button>

                  {#if st.status === "Ordered" || order.status === "Ordered"}
                    <button class="btn btn-expense btn-sm" onclick={() => promoteToExpense(order)} disabled={st.addingExpense} title="Add this order as an expense and mark it Received">
                      {st.addingExpense ? "Adding…" : "📋 Add as Expense"}
                    </button>
                  {/if}
                </div>
              </div>

              {#if st.tracking && order.status === "Ordered"}
                <div class="tracking-info">
                  🚚 Tracking: <span class="monospace">{st.tracking}</span>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <!-- ── BUDGET SETTINGS ──────────────────────────────────────────────── -->
    <section class="admin-section">
      <div style="border-top:1px solid var(--border); margin: 32px 0;"></div>
      <h2>Budget Settings</h2>
      <p class="text-muted" style="margin-bottom:16px;font-size:0.9rem">Adjust category budget allocations.</p>

      <div class="manager-layout">
        <div class="card editor-card">
          <h3 style="margin-bottom:4px">Category Budgets</h3>
          <p class="text-muted" style="font-size:0.85rem;margin-bottom:24px">
            Set the spending budget for each category. These are reflected on the dashboard.
          </p>

          {#if $budgetError}
            <div class="error-bar">{$budgetError}</div>
          {/if}
          {#if saveErr}
            <div class="error-bar">{saveErr}</div>
          {/if}
          {#if saveMsg}
            <div class="success-bar">{saveMsg}</div>
          {/if}

          {#if $budgetLoading && Object.keys(draftBudgets).length === 0}
            <div class="empty-state"><span class="spinning">↻</span> Loading…</div>
          {:else}
            <div class="budget-editor">
              {#each Object.entries(CATEGORY_META) as [cat, meta]}
                <div class="budget-editor-row">
                  <div class="cat-label">
                    <span class="cat-icon">{meta.icon}</span>
                    <span style="font-weight:600;color:{meta.color}">{meta.label}</span>
                  </div>
                  <div class="form-group" style="flex:1">
                    <label for="budget-{cat}" class="sr-only">{meta.label} budget</label>
                    <div class="input-dollar">
                      <span class="dollar-sign">$</span>
                      <input id="budget-{cat}" type="number" min="0" step="1" bind:value={draftBudgets[cat]} placeholder="0" />
                    </div>
                  </div>
                </div>
              {/each}
            </div>

            <div class="total-row">
              <span class="text-muted" style="font-size:0.875rem">Total Budget</span>
              <span style="font-size:1.4rem;font-weight:700;color:var(--primary)">{formatCurrency(draftTotal)}</span>
            </div>

            <div style="display:flex;gap:10px;margin-top:20px">
              <button class="btn btn-primary" onclick={handleSaveBudget} disabled={savingBudget}>
                {savingBudget ? "Saving…" : "Save Budget"}
              </button>
              <button class="btn btn-ghost" onclick={resetDraft}>Reset</button>
            </div>
          {/if}
        </div>

        <div>
          <div class="section-title" style="margin-bottom:12px">Current Budget Allocation</div>
          <div class="allocation-cards">
            {#each Object.entries(CATEGORY_META) as [cat, meta]}
              {@const budget = $budgetCategories[cat] || 0}
              {@const pct = $budgetTotal > 0 ? (budget / $budgetTotal) * 100 : 0}
              <div class="card alloc-card">
                <div class="alloc-icon">{meta.icon}</div>
                <div class="alloc-label" style="color:{meta.color}">{meta.label}</div>
                <div class="alloc-amount">{formatCurrency(budget)}</div>
                <div class="alloc-bar-track">
                  <div class="alloc-bar-fill" style="width:{pct}%;background:{meta.color}"></div>
                </div>
                <div class="alloc-pct text-muted">{pct.toFixed(0)}% of total</div>
              </div>
            {/each}
          </div>

          <div class="card total-card">
            <div class="card-title">Total Season Budget</div>
            <div style="font-size:2rem;font-weight:700;color:var(--primary)">
              {formatCurrency($budgetTotal)}
            </div>
            <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px">
              Across {Object.keys(CATEGORY_META).length} categories
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
{/if}

<style>
  /* ── Lock Screen ──────────────────────────────────────────────────────────── */
  .lock-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 70vh;
  }
  .lock-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 48px 40px;
    width: 100%;
    max-width: 400px;
    text-align: center;
    box-shadow: var(--shadow-lg);
  }
  .lock-icon {
    font-size: 3rem;
    margin-bottom: 16px;
  }
  .lock-card h1 {
    margin-bottom: 8px;
  }

  /* ── Admin Panel ──────────────────────────────────────────────────────────── */
  .unlocked-badge {
    font-size: 0.8rem;
    font-weight: 600;
    color: #6bcb77;
    background: rgba(107, 203, 119, 0.12);
    border: 1px solid rgba(107, 203, 119, 0.3);
    padding: 4px 10px;
    border-radius: 999px;
  }

  .admin-section h2 {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 4px;
    color: var(--text);
  }

  .orders-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 12px;
  }

  .order-card {
    padding: 20px;
    border-left: 3px solid var(--primary);
    transition: border-color 0.2s;
  }

  .order-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 16px;
  }

  .order-name {
    font-size: 1.05rem;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .order-name a {
    color: var(--primary);
  }

  .order-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .meta-chip {
    font-size: 0.78rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    padding: 2px 8px;
    border-radius: 999px;
    color: var(--text-muted);
  }

  .current-status {
    flex-shrink: 0;
  }

  .order-controls {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
  }

  .control-row {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: flex-end;
  }

  .action-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .btn-expense {
    background: rgba(107, 203, 119, 0.15);
    color: #6bcb77;
    border: 1px solid rgba(107, 203, 119, 0.3);
  }
  .btn-expense:hover {
    background: rgba(107, 203, 119, 0.25);
    color: #6bcb77;
  }

  .tracking-info {
    margin-top: 12px;
    font-size: 0.82rem;
    color: var(--text-muted);
    background: var(--surface-2);
    padding: 8px 12px;
    border-radius: var(--radius-sm);
  }

  .success-bar {
    background: rgba(107, 203, 119, 0.12);
    border: 1px solid rgba(107, 203, 119, 0.3);
    color: #6bcb77;
    padding: 10px 16px;
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
    margin-bottom: 16px;
  }

  /* ── Manager Panel ────────────────────────────────────────────────────────── */
  .manager-layout {
    display: grid;
    grid-template-columns: 420px 1fr;
    gap: 24px;
    align-items: start;
  }
  @media (max-width: 1000px) {
    .manager-layout {
      grid-template-columns: 1fr;
    }
  }

  .editor-card {
    padding: 28px;
  }

  .budget-editor {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .budget-editor-row {
    display: grid;
    grid-template-columns: 160px 1fr;
    gap: 12px;
    align-items: center;
  }

  .cat-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
  }
  .cat-icon {
    font-size: 1.1rem;
  }

  .input-dollar {
    position: relative;
    display: flex;
    align-items: center;
  }
  .dollar-sign {
    position: absolute;
    left: 12px;
    color: var(--text-muted);
    font-weight: 600;
    pointer-events: none;
  }
  .input-dollar input {
    padding-left: 28px;
  }

  .total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
  }

  /* ── Allocation Cards ─────────────────────────────────────────────────────── */
  .allocation-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }
  .alloc-card {
    padding: 16px;
    text-align: center;
  }
  .alloc-icon {
    font-size: 1.5rem;
    margin-bottom: 8px;
  }
  .alloc-label {
    font-weight: 600;
    font-size: 0.85rem;
    margin-bottom: 4px;
  }
  .alloc-amount {
    font-size: 1.2rem;
    font-weight: 700;
    margin-bottom: 10px;
  }
  .alloc-bar-track {
    height: 4px;
    background: var(--surface-2);
    border-radius: 999px;
    overflow: hidden;
    margin-bottom: 6px;
  }
  .alloc-bar-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.4s ease;
  }
  .alloc-pct {
    font-size: 0.75rem;
  }

  .total-card {
    padding: 20px;
    text-align: center;
    border: 1px solid var(--primary);
    background: var(--primary-glow);
  }
</style>
