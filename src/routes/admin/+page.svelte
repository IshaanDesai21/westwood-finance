<script>
  import { onMount } from "svelte";
  import OrderStatusBadge from "$lib/components/OrderStatusBadge.svelte";
  import CustomDropdown from "$lib/components/CustomDropdown.svelte";
  import LoadingIndicator from "$lib/components/LoadingIndicator.svelte";
  import { formatCurrency, formatDate } from "$lib/utils.js";

  // ── API Config ──────────────────────────────────────────────────────────────
  const BASE_URL =
    "https://script.google.com/macros/s/AKfycbxc8jeXwQ9FyFWIdhGmPZ7I674wt8wyjFkG1fdp0CP_AwLEJYXMdJcVgxAwu0YRQl3adA/exec";
  const SECRET_KEY = "YOUR_SECRET_KEY";

  const ORDER_STATUSES = ["Submitted and in review", "Ordered", "Received"];
  const CATEGORIES = ["hardware", "software", "outreach", "food", "miscellaneous"];

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

  // ── State ───────────────────────────────────────────────────────────────────
  let orders = $state(/** @type {any[]} */ ([]));
  let budget = $state(/** @type {Record<string,any>|null} */ (null));
  let loading = $state(true);
  let error = $state(/** @type {string|null} */ (null));

  let unlocked = $state(false);
  let passwordInput = $state("");
  let authError = $state("");

  // Per-order state for status and tracking inputs
  /** @type {Record<string, { status: string, tracking: string, saving: boolean, addingExpense: boolean }>} */
  let orderState = $state({});

  // Local editable copy of budgets
  /** @type {Record<string,number>} */
  let draftBudgets = $state({});
  let savingBudget = $state(false);
  let saveMsg = $state("");
  let saveErr = $state("");

  let actionMsg = $state("");
  let actionErr = $state("");

  // ── Data Loading ─────────────────────────────────────────────────────────────
  async function loadData() {
    loading = true;
    error = null;
    try {
      const [oRes, bRes] = await Promise.all([
        fetch(`${BASE_URL}?action=getOrders&key=${SECRET_KEY}`),
        fetch(`${BASE_URL}?action=getBudget&key=${SECRET_KEY}`),
      ]);

      if (!oRes.ok || !bRes.ok) throw new Error("API Fetch Failed");

      orders = await oRes.json();
      budget = await bRes.json();
      
      // Initialize draft budgets
      if (budget?.Total) {
        draftBudgets = {};
        for (const cat of CATEGORIES) {
          draftBudgets[cat] = budget.Total[cat] || 0;
        }
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Data loading failed";
      console.error(e);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadData();
  });

  function tryUnlock() {
    if (passwordInput === "/dev3432") {
      unlocked = true;
      authError = "";
      passwordInput = "";
    } else {
      authError = "Incorrect password. Please try again.";
      passwordInput = "";
    }
  }

  // ── Derived logic ───────────────────────────────────────────────────────────
  let inProgressOrders = $derived(
    orders.filter((o) => (o.Status || o.status) !== "Received"),
  );

  let budgetTotalValue = $derived(budget?.Total?.["Final"] || 0);
  let budgetCategories = $derived(budget?.Total || {});

  function getState(/** @type {any} */ order) {
    const id = order["List UUID"] || order.id || order.rowIndex;
    if (!orderState[id]) {
      orderState[id] = {
        status: order.Status || order.status || "Submitted and in review",
        tracking: order.Tracking || order.tracking || "",
        saving: false,
        addingExpense: false,
      };
    }
    return orderState[id];
  }

  // ── Actions ─────────────────────────────────────────────────────────────────
  async function saveStatus(/** @type {any} */ order) {
    const id = order["List UUID"] || order.id || order.rowIndex;
    const st = getState(order);
    st.saving = true;
    actionErr = "";
    actionMsg = "";
    try {
      const params = new URLSearchParams({
        action: "updateOrderStatus",
        key: SECRET_KEY,
        id: id,
        rowIndex: order.rowIndex,
        status: st.status,
        tracking: st.tracking
      });
      const res = await fetch(`${BASE_URL}?${params.toString()}`);
      const result = await res.json();
      if (!res.ok || result?.error) throw new Error(result?.error || "Update failed");
      
      actionMsg = `✓ Status updated for "${order.Item || order.item}"`;
      await loadData();
    } catch (e) {
      actionErr = e instanceof Error ? e.message : "Update failed";
    } finally {
      st.saving = false;
    }
  }

  async function promoteToExpense(/** @type {any} */ order) {
    const id = order["List UUID"] || order.id || order.rowIndex;
    const st = getState(order);
    if (!confirm(`Mark "${order.Item || order.item}" as Received and sync to budget?`))
      return;
    
    st.addingExpense = true;
    actionErr = "";
    actionMsg = "";
    try {
      // Promoting to expense usually means marking as Received
      const params = new URLSearchParams({
        action: "updateOrderStatus",
        key: SECRET_KEY,
        id: id,
        rowIndex: order.rowIndex,
        status: "Received",
        tracking: st.tracking
      });
      const res = await fetch(`${BASE_URL}?${params.toString()}`);
      const result = await res.json();
      if (!res.ok || result?.error) throw new Error(result?.error || "Failed; to promote");

      actionMsg = `✓ "${order.Item || order.item}" marked as Received!`;
      await loadData();
    } catch (e) {
      actionErr = e instanceof Error ? e.message : "Promotion failed";
    } finally {
      st.addingExpense = false;
    }
  }

  async function handleSaveBudget() {
    savingBudget = true;
    saveMsg = "";
    saveErr = "";
    try {
      const params = new URLSearchParams({
        action: "saveBudget",
        key: SECRET_KEY,
        ...draftBudgets
      });
      const res = await fetch(`${BASE_URL}?${params.toString()}`);
      const result = await res.json();
      if (!res.ok || result?.error) throw new Error(result?.error || "Save failed");

      saveMsg = "✓ Budget saved successfully!";
      await loadData();
    } catch (e) {
      saveErr = e instanceof Error ? e.message : "Save failed";
    } finally {
      savingBudget = false;
    }
  }

  function resetDraft() {
    if (budget?.Total) {
      for (const cat of CATEGORIES) {
        draftBudgets[cat] = budget.Total[cat] || 0;
      }
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
    <div class="lock-card card">
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
      <button class="btn btn-ghost btn-sm" onclick={loadData} disabled={loading}>
        <span class:spinning={loading}>↻</span> Refresh All
      </button>
    </div>
  </div>

  <div class="admin-sections fade-in">
    <!-- ── ORDER MANAGEMENT ─────────────────────────────────────────────── -->
    <section class="admin-section">
      <h2>Order Management</h2>
      <p class="text-muted" style="margin-bottom:16px;font-size:0.9rem">
        Update statuses for pending orders and track shipments.
      </p>

      {#if actionErr}
        <div class="error-bar">{actionErr}</div>
      {/if}
      {#if actionMsg}
        <div class="success-bar">{actionMsg}</div>
      {/if}

      {#if loading && !orders.length}
        <LoadingIndicator text="Loading orders" />
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
          {#each inProgressOrders as order (order["List UUID"] || order.id || order.rowIndex)}
            {@const st = getState(order)}
            <div class="order-card card fade-in">
              <div class="order-header">
                <div class="order-info">
                  <div class="order-name">
                    {#if order.Link || order.link}
                      <a href={order.Link || order.link} target="_blank" rel="noopener">{order.Item || order.item}</a>
                    {:else}
                      {order.Item || order.item}
                    {/if}
                  </div>
                  <div class="order-meta">
                    {#if order.Company || order.company}<span class="meta-chip">🏢 {order.Company || order.company}</span>{/if}
                    <span class="meta-chip">📂 {order.Category || order.category}</span>
                    <span class="meta-chip">👤 {order.Team || order.user || "—"}</span>
                    <span class="meta-chip monospace">{formatCurrency(order.Total || order.total)}</span>
                  </div>
                </div>
                <div class="current-status">
                  <OrderStatusBadge status={order.Status || order.status || "Submitted and in review"} />
                </div>
              </div>

              <div class="order-controls">
                <div class="control-row">
                  <div class="form-group" style="flex:1;min-width:200px">
                    <label for="status-{order.rowIndex}">Change Status</label>
                    <CustomDropdown 
                      options={ORDER_STATUSES} 
                      bind:value={st.status} 
                    />
                  </div>

                  {#if st.status === "Ordered"}
                    <div class="form-group" style="flex:2;min-width:200px">
                      <label for="tracking-{order.rowIndex}">Tracking Info</label>
                      <input id="tracking-{order.rowIndex}" type="text" bind:value={st.tracking} placeholder="Tracking number or link" />
                    </div>
                  {/if}
                </div>

                <div class="action-row">
                  <button class="btn btn-primary btn-sm" onclick={() => saveStatus(order)} disabled={st.saving}>
                    {st.saving ? "Saving…" : "Update Status"}
                  </button>

                  {#if st.status === "Ordered" || (order.Status || order.status) === "Ordered"}
                    <button class="btn btn-expense btn-sm" onclick={() => promoteToExpense(order)} disabled={st.addingExpense}>
                      {st.addingExpense ? "Adding…" : "📋 Mark Received"}
                    </button>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <!-- ── BUDGET SETTINGS ──────────────────────────────────────────────── -->
    <section class="admin-section">
      <div style="border-top:1px solid var(--border); margin: 32px 0;"></div>
      <h2>Budget Settings</h2>
      <p class="text-muted" style="margin-bottom:16px;font-size:0.9rem">Adjust category budget allocations for the season.</p>

      <div class="manager-layout">
        <div class="card editor-card">
          <h3 style="margin-bottom:4px">Category Budgets</h3>
          <p class="text-muted" style="font-size:0.85rem;margin-bottom:24px">
            Set the spending budget for each category.
          </p>

          {#if saveErr}
            <div class="error-bar">{saveErr}</div>
          {/if}
          {#if saveMsg}
            <div class="success-bar">{saveMsg}</div>
          {/if}

          {#if loading && !budget}
            <LoadingIndicator />
          {:else}
            <div class="budget-editor">
              {#each Object.entries(CATEGORY_META) as [cat, meta]}
                <div class="budget-editor-row">
                  <div class="cat-label">
                    <span class="cat-icon">{meta.icon}</span>
                    <span style="font-weight:600;color:{meta.color}">{meta.label}</span>
                  </div>
                  <div class="form-group" style="flex:1">
                    <div class="input-dollar">
                      <span class="dollar-sign">$</span>
                      <input type="number" min="0" step="1" bind:value={draftBudgets[cat]} placeholder="0" />
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
          <div class="section-title" style="margin-bottom:12px; margin-top:36px;">Current Allocation</div>
          <div class="allocation-cards">
            {#each Object.entries(CATEGORY_META) as [cat, meta]}
              {@const current = budgetCategories[cat] || 0}
              {@const pct = budgetTotalValue > 0 ? (current / budgetTotalValue) * 100 : 0}
              <div class="card alloc-card">
                <div class="alloc-icon">{meta.icon}</div>
                <div class="alloc-label" style="color:{meta.color}">{meta.label}</div>
                <div class="alloc-amount">{formatCurrency(current)}</div>
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
              {formatCurrency(budgetTotalValue)}
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
{/if}

<style>
  .admin-sections {
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .lock-screen {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 70vh;
  }
  .lock-card {
    width: 100%;
    max-width: 400px;
    padding: 40px;
    text-align: center;
  }
  .lock-icon { font-size: 3rem; margin-bottom: 20px; }

  .unlocked-badge {
    font-size: 0.75rem;
    font-weight: 700;
    color: #6bcb77;
    background: rgba(107, 203, 119, 0.1);
    padding: 4px 10px;
    border-radius: 99px;
    border: 1px solid rgba(107, 203, 119, 0.3);
  }

  /* Order Management */
  .orders-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .order-card {
    padding: 24px;
  }
  .order-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
  }
  .order-name { font-size: 1.1rem; font-weight: 700; }
  .order-meta { display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
  .meta-chip { font-size: 0.7rem; background: var(--surface-2); padding: 2px 8px; border-radius: 4px; color: var(--text-muted); }

  .order-controls {
    background: var(--surface-2);
    padding: 16px;
    border-radius: var(--radius-md);
  }
  .control-row { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
  .action-row { display: flex; gap: 12px; }

  /* Budget Management */
  .manager-layout { display: grid; grid-template-columns: 1fr 300px; gap: 24px; }
  @media (max-width: 900px) { .manager-layout { grid-template-columns: 1fr; } }

  .budget-editor { display: flex; flex-direction: column; gap: 12px; }
  .budget-editor-row { display: flex; align-items: center; gap: 16px; padding: 12px; border-bottom: 1px solid var(--border); }
  .cat-label { display: flex; align-items: center; gap: 10px; width: 140px; }
  .total-row { display: flex; justify-content: space-between; align-items: baseline; margin-top: 16px; padding: 12px; background: var(--surface-2); border-radius: 8px; }

  .allocation-cards { display: grid; gap: 12px; margin-top: 10px; }
  .alloc-card { padding: 12px; position: relative; }
  .alloc-amount { font-weight: 700; margin: 4px 0; }
  .alloc-bar-track { height: 4px; background: var(--surface-2); border-radius: 99px; }
  .alloc-bar-fill { height: 100%; border-radius: 99px; }
  .alloc-pct { font-size: 0.7rem; margin-top: 4px; }

  .btn-expense { background: #4e9af1; color: white; border: none; }
  .btn-expense:hover { background: #3a85db; }

  .input-dollar { position: relative; display: flex; align-items: center; }
  .dollar-sign { position: absolute; left: 10px; color: var(--text-muted); }
  .input-dollar input { padding-left: 24px !important; }
</style>
