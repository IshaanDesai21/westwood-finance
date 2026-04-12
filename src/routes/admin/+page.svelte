<script>
  import { onMount } from 'svelte';
  import OrderStatusBadge from '$lib/components/OrderStatusBadge.svelte';
  import { orders, loading, error, loadOrders, updateOrderStatus } from '$lib/stores/orders.js';
  import { api } from '$lib/api.js';
  import { formatCurrency, formatDate } from '$lib/utils.js';

  const ORDER_STATUSES = ['Submitted and in review', 'Ordered', 'Received'];
  const CATEGORIES = ['hardware', 'software', 'outreach', 'food', 'miscellaneous'];

  let unlocked = $state(false);
  let passwordInput = $state('');
  let authError = $state('');

  let updatingRow = $state(/** @type {number|null} */ (null));
  let actionMsg = $state('');
  let actionErr = $state('');

  // Per-order state for status and tracking inputs
  /** @type {Record<number, { status: string, tracking: string, saving: boolean, addingExpense: boolean }>} */
  let orderState = $state({});

  onMount(() => loadOrders(true));

  async function tryUnlock() {
    try {
      await api.auth.verify(passwordInput);
      unlocked = true;
      authError = '';
    } catch (e) {
      authError = 'Incorrect password. Please try again.';
      passwordInput = '';
    }
  }

  // Initialize per-order state from loaded orders
  let inProgressOrders = $derived(
    $orders.filter(o => o.status !== 'Received')
  );

  function getState(/** @type {any} */ order) {
    if (!orderState[order.id]) {
      orderState[order.id] = {
        status: order.status || 'Submitted and in review',
        tracking: order.tracking || '',
        saving: false,
        addingExpense: false,
      };
    }
    return orderState[order.id];
  }

  async function saveStatus(/** @type {any} */ order) {
    const st = getState(order);
    st.saving = true;
    actionErr = ''; actionMsg = '';
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
    if (!confirm(`Add "${order.item}" as an expense and mark as Received?`)) return;
    st.addingExpense = true;
    actionErr = ''; actionMsg = '';
    try {
      // Add to expenses
      await api.expenses.create({
        item: order.item,
        company: order.company,
        link: order.link,
        price: order.price,
        quantity: order.quantity,
        notes: order.notes,
        category: CATEGORIES.includes(order.category) ? order.category : 'miscellaneous',
        user: order.user,
      });
      // Update order status to Received
      await updateOrderStatus(order.rowIndex, 'Received', st.tracking);
      actionMsg = `✓ "${order.item}" added as an expense and marked Received!`;
    } catch (e) {
      actionErr = /** @type {any} */ (e)?.message || String(e);
    } finally {
      st.addingExpense = false;
    }
  }
</script>

<svelte:head>
  <title>Admin — Westwood Finance</title>
</svelte:head>

{#if !unlocked}
  <!-- ── Lock Screen ──────────────────────────────────────────────────────── -->
  <div class="lock-screen">
    <div class="lock-card">
      <div class="lock-icon">🔐</div>
      <h1>Admin Access</h1>
      <p class="text-muted" style="margin-bottom:24px;font-size:0.9rem">
        Enter the admin password to manage order statuses.
      </p>
      {#if authError}
        <div class="error-bar" style="margin-bottom:16px">{authError}</div>
      {/if}
      <form onsubmit={e => { e.preventDefault(); tryUnlock(); }} id="admin-login-form">
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
        <button type="submit" class="btn btn-primary" style="width:100%">Unlock</button>
      </form>
    </div>
  </div>
{:else}
  <!-- ── Admin Panel ──────────────────────────────────────────────────────── -->
  <div class="page-header">
    <h1>Admin <span>Order Management</span></h1>
    <div style="display:flex;gap:8px;align-items:center">
      <span class="unlocked-badge">🔓 Unlocked</span>
      <button class="btn btn-ghost btn-sm" onclick={() => loadOrders(true)}>
        <span>↻</span> Refresh
      </button>
    </div>
  </div>

  {#if actionErr}
    <div class="error-bar">{actionErr}</div>
  {/if}
  {#if actionMsg}
    <div class="success-bar">{actionMsg}</div>
  {/if}

  {#if $loading}
    <div class="empty-state"><span class="spinning">↻</span> Loading orders…</div>
  {:else if inProgressOrders.length === 0}
    <div class="empty-state card">
      <div class="icon">✅</div>
      All orders have been received! No pending orders.
    </div>
  {:else}
    <div class="section-title">In-Progress Orders ({inProgressOrders.length})</div>

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
                <span class="meta-chip">👤 {order.user || '—'}</span>
                <span class="meta-chip monospace">{formatCurrency(order.total)}</span>
                {#if order.timestamp}<span class="meta-chip text-muted">{order.timestamp?.slice(0,10)}</span>{/if}
              </div>
              {#if order.notes}
                <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px">{order.notes}</div>
              {/if}
            </div>
            <div class="current-status">
              <OrderStatusBadge status={order.status || 'Submitted and in review'} />
            </div>
          </div>

          <div class="order-controls">
            <div class="control-row">
              <div class="form-group" style="flex:1;min-width:200px">
                <label for="status-{order.id}">Change Status</label>
                <select id="status-{order.id}" bind:value={st.status}>
                  {#each ORDER_STATUSES as s}
                    <option value={s}>{s}</option>
                  {/each}
                </select>
              </div>

              {#if st.status === 'Ordered'}
                <div class="form-group" style="flex:2;min-width:200px">
                  <label for="tracking-{order.id}">Tracking Info <span class="text-muted">(optional)</span></label>
                  <input
                    id="tracking-{order.id}"
                    type="text"
                    bind:value={st.tracking}
                    placeholder="Tracking number or link"
                  />
                </div>
              {/if}
            </div>

            <div class="action-row">
              <button
                class="btn btn-primary btn-sm"
                onclick={() => saveStatus(order)}
                disabled={st.saving}
              >
                {st.saving ? 'Saving…' : 'Update Status'}
              </button>

              {#if st.status === 'Ordered' || order.status === 'Ordered'}
                <button
                  class="btn btn-expense btn-sm"
                  onclick={() => promoteToExpense(order)}
                  disabled={st.addingExpense}
                  title="Add this order as an expense and mark it Received"
                >
                  {st.addingExpense ? 'Adding…' : '📋 Add as Expense'}
                </button>
              {/if}
            </div>
          </div>

          {#if st.tracking && order.status === 'Ordered'}
            <div class="tracking-info">
              🚚 Tracking: <span class="monospace">{st.tracking}</span>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
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
  .lock-icon { font-size: 3rem; margin-bottom: 16px; }
  .lock-card h1 { margin-bottom: 8px; }

  /* ── Admin Panel ──────────────────────────────────────────────────────────── */
  .unlocked-badge {
    font-size: 0.8rem;
    font-weight: 600;
    color: #6bcb77;
    background: rgba(107,203,119,0.12);
    border: 1px solid rgba(107,203,119,0.3);
    padding: 4px 10px;
    border-radius: 999px;
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
  .order-name a { color: var(--primary); }

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

  .current-status { flex-shrink: 0; }

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
    background: rgba(107,203,119,0.15);
    color: #6bcb77;
    border: 1px solid rgba(107,203,119,0.3);
  }
  .btn-expense:hover {
    background: rgba(107,203,119,0.25);
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
    background: rgba(107,203,119,0.12);
    border: 1px solid rgba(107,203,119,0.3);
    color: #6bcb77;
    padding: 10px 16px;
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
    margin-bottom: 16px;
  }
</style>
