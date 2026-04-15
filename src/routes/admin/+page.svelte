<script>
  import { onMount } from "svelte";
  import OrderStatusBadge from "$lib/components/OrderStatusBadge.svelte";
  import CustomDropdown from "$lib/components/CustomDropdown.svelte";
  import LoadingIndicator from "$lib/components/LoadingIndicator.svelte";
  import { formatCurrency, formatDate } from "$lib/utils.js";
  import { dataService } from "$lib/dataService.svelte.js";

  /** @typedef {import('$lib/dataService.svelte.js').Order} Order */

  // ── API Config ──────────────────────────────────────────────────────────────
  const BASE_URL = "https://script.google.com/macros/s/AKfycbyN3GVRJLgyyOy35q6FUnnKdVlMxFVTVlpsemhyI8qu6DvXkLhP43zRbxPD_lhJ8nXwXQ/exec";
  const SECRET_KEY = "YOUR_SECRET_KEY";

  const ORDER_STATUSES = [
    "Submitted and in review",
    "Approved",
    "Ordered",
    "Received",
    "Denied",
    "Cancelled",
  ];

  // ── State ───────────────────────────────────────────────────────────────────
  /** @type {{ orders: Order[], loading: boolean, error: string|null }} */
  let { orders, loading, error } = $derived(dataService);
  let syncing = $state(false);

  let unlocked = $state(false);
  let adminPassInput = $state("");
  let authError = $state("");
  let showPassword = $state(false);

  let actionMsg = $state("");
  let actionErr = $state("");

  // ── Modal state ─────────────────────────────────────────────────────────────
  /** @type {Order|null} */
  let editingOrder = $state(null);
  let editStatus = $state("");
  let editTracking = $state("");
  let editUUID = $state("");
  let editSaving = $state(false);

  // ── Data Loading ─────────────────────────────────────────────────────────────
  onMount(() => {
    dataService.load(); // Uses persistent cache for instant load
  });

  async function sync() {
    syncing = true;
    await dataService.load(true);
    syncing = false;
  }

  function tryUnlock() {
    const cleanPass = adminPassInput.trim();
    if (cleanPass === "/dev3432") {
      unlocked = true;
      authError = "";
      adminPassInput = "";
    } else {
      authError = "Incorrect password. Please try again.";
      adminPassInput = "";
    }
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────────
  function openEdit(/** @type {Order} */ order) {
    editingOrder = order;
    editStatus = order.status || "Submitted and in review";
    editTracking = order.tracking || "";
    editUUID = order.orderUUID || "";
    editSaving = false;
    actionMsg = "";
    actionErr = "";
  }

  function closeEdit() {
    editingOrder = null;
  }

  async function saveEdit() {
    if (!editingOrder) return;
    editSaving = true;
    actionErr = "";
    actionMsg = "";
    try {
      const params = new URLSearchParams({
        action: "updateOrderStatus",
        key: SECRET_KEY,
        id: editingOrder.id,
        rowIndex: editingOrder.rowIndex.toString(),
        status: editStatus,
        tracking: editTracking,
        orderUUID: editUUID,
      });
      const res = await fetch(`${BASE_URL}?${params.toString()}`);
      const result = await res.json();
      if (!res.ok || result?.error)
        throw new Error(result?.error || "Update failed");

      actionMsg = `✓ "${editingOrder.item}" updated!`;
      closeEdit();
      await dataService.load(true); // Force refresh shared store
    } catch (e) {
      actionErr = e instanceof Error ? e.message : "Update failed";
    } finally {
      editSaving = false;
    }
  }

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
  <title>Admin Dashboard — Westwood Finance</title>
</svelte:head>

{#if !unlocked}
  <!-- ── Lock Screen ──────────────────────────────────────────────────────── -->
  <div class="lock-screen">
    <div class="lock-card card">
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
          <div style="position:relative; display:flex; align-items:center;">
            <input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              bind:value={adminPassInput}
              placeholder="Enter admin password"
              autocomplete="current-password"
              style="padding-right: 40px;"
            />
            <button
              type="button"
              onmousedown={() => {
                showPassword = true;
              }}
              onmouseup={() => {
                showPassword = false;
              }}
              onmouseleave={() => {
                showPassword = false;
              }}
              ontouchstart={(e) => {
                e.preventDefault();
                showPassword = true;
              }}
              ontouchend={(e) => {
                e.preventDefault();
                showPassword = false;
              }}
              style="position:absolute; right:10px; background:none; border:none; cursor:pointer; color:var(--text-muted); display:flex; padding:4px;"
              title="Hold to show password"
              aria-label="Hold to show password"
            >
              {#if showPassword}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  ><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                  ></path><circle cx="12" cy="12" r="3"></circle></svg
                >
              {:else}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  ><path
                    d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                  ></path><line x1="1" y1="1" x2="23" y2="23"></line></svg
                >
              {/if}
            </button>
          </div>
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
      <button
        class="btn btn-ghost btn-sm"
        onclick={sync}
        disabled={syncing}
      >
        <span class:spinning={syncing}>↻</span> {syncing ? "Syncing..." : "Refresh Data"}
      </button>
    </div>
  </div>

  {#if actionMsg}
    <div class="success-bar">{actionMsg}</div>
  {/if}
  {#if actionErr}
    <div class="error-bar">{actionErr}</div>
  {/if}

  <section>
    <div class="section-title" style="margin-bottom:12px">
      Manage All Orders ({orders.length})
    </div>
    <p class="text-muted" style="margin-bottom:16px;font-size:0.875rem">
      Manage order statuses, UUIDs, and tracking links. All updates sync directly to Google Sheets.
    </p>

    <div class="card" style="padding:0;overflow:hidden">
      {#if loading && !orders.length}
        <LoadingIndicator text="Loading orders from cache..." />
      {:else if orders.length === 0}
        <div class="empty-state">
          <div class="icon">📦</div>
          No orders found in the database.
        </div>
      {:else}
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Company</th>
                <th>Category</th>
                <th>Team</th>
                <th>Date</th>
                <th class="text-right">Price</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Total</th>
                <th>Status</th>
                <th class="text-right">Order UUID</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {#each orders as order (order.id)}
                {@const orderColor = getOrderColor(order.orderUUID)}
                <tr class="fade-in group-row" style="--group-color: {orderColor}">
                  <td>
                    <div style="font-weight:500">
                      {#if order.link}
                        <a href={order.link} target="_blank" rel="noopener">{order.item}</a>
                      {:else}
                        {order.item}
                      {/if}
                    </div>
                    {#if order.notes}
                      <div style="font-size:0.78rem;color:var(--text-muted)">{order.notes}</div>
                    {/if}
                  </td>
                  <td>{order.company || "—"}</td>
                  <td>
                    <span class="badge badge-{(order.category || '').toLowerCase()}">
                      {order.category || "—"}
                    </span>
                  </td>
                  <td>{order.team || "—"}</td>
                  <td class="text-muted">{(order.timestamp || "").slice(0, 10) || "—"}</td>
                  <td class="text-right monospace">{formatCurrency(order.price)}</td>
                  <td class="text-right">{order.quantity || "—"}</td>
                  <td class="text-right monospace" style="font-weight:600">
                    {formatCurrency(order.total)}
                  </td>
                  <td><OrderStatusBadge status={order.status} /></td>
                  <td class="text-right monospace" style="font-size:0.72rem;color:var(--text-muted)">
                    {order.orderUUID || "—"}
                  </td>
                  <td>
                    <button class="btn btn-primary btn-edit" onclick={() => openEdit(order)}>
                      Manage
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </section>
{/if}

<!-- ── Edit Modal ────────────────────────────────────────────────────────────── -->
{#if editingOrder}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
  <div
    class="modal-backdrop"
    onclick={closeEdit}
    onkeydown={(e) => e.key === "Escape" && closeEdit()}
    role="button"
    tabindex="0"
    aria-label="Close modal"
  >
    <div
      class="modal-card card"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="Edit Order"
      tabindex="-1"
    >
      <div class="modal-header">
        <div>
          <h2 style="margin:0">Edit Order</h2>
          <p class="text-muted" style="margin:4px 0 0;font-size:0.85rem">
            {editingOrder.item}
          </p>
        </div>
        <button class="modal-close" onclick={closeEdit} aria-label="Close">✕</button>
      </div>

      {#if actionErr}
        <div class="error-bar" style="margin-bottom:16px">{actionErr}</div>
      {/if}

      <form onsubmit={(e) => { e.preventDefault(); saveEdit(); }} id="edit-order-form">
        <div class="modal-fields">
          <div class="form-group">
            <label for="edit-status">Status</label>
            <CustomDropdown options={ORDER_STATUSES} bind:value={editStatus} />
          </div>

          <div class="form-group">
            <label for="edit-uuid">Order UUID</label>
            <input id="edit-uuid" type="text" bind:value={editUUID} placeholder="e.g. ORD-2026-001" />
          </div>

          <div class="form-group" style="grid-column: 1 / -1">
            <label for="edit-tracking">Tracking Link / Number</label>
            <input id="edit-tracking" type="text" bind:value={editTracking} placeholder="e.g. UPS/Status..." />
          </div>
        </div>

        <div class="order-summary">
          <div class="summary-row"><span class="text-muted">Company</span><span>{editingOrder.company || "—"}</span></div>
          <div class="summary-row"><span class="text-muted">Team</span><span>{editingOrder.team || "—"}</span></div>
          <div class="summary-row"><span class="text-muted">Category</span><span>{editingOrder.category || "—"}</span></div>
          <div class="summary-row"><span class="text-muted">Total</span><span class="monospace" style="font-weight:700;color:#6bcb77">{formatCurrency(editingOrder.total)}</span></div>
        </div>

        <div class="modal-actions">
          <button type="submit" class="btn btn-primary" disabled={editSaving}>
            {editSaving ? "Saving…" : "Save Changes"}
          </button>
          <button type="button" class="btn btn-ghost" onclick={closeEdit} disabled={editSaving}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  /* ── Lock Screen ──────────────────────────────────────────────────────────── */
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

  /* Group Indicator Line */
  .group-row td:first-child {
    position: relative;
    padding-left: 20px;
  }
  .group-row td:first-child::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: var(--group-color);
    box-shadow: none;
    opacity: 0.9;
  }

  /* ── Table ────────────────────────────────────────────────────────────────── */
  .btn-edit {
    padding: 6px 16px;
    font-size: 0.8rem;
    font-weight: 600;
    border-radius: 6px;
    background: var(--primary);
    box-shadow: 0 2px 8px rgba(78, 154, 241, 0.25);
    transition: all 0.2s ease;
  }
  .btn-edit:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(78, 154, 241, 0.4);
    filter: brightness(1.1);
  }

  /* ── Modal ────────────────────────────────────────────────────────────────── */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .modal-card {
    width: 100%;
    max-width: 560px;
    padding: 32px;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;
  }

  .modal-close {
    background: none;
    border: none;
    font-size: 1.1rem;
    color: var(--text-muted);
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
  }

  .modal-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;
  }

  .order-summary {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px 20px;
    background: var(--surface-2);
    border-radius: var(--radius-sm);
    padding: 16px;
    margin-bottom: 24px;
  }

  .summary-row {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 0.85rem;
  }

  .summary-row .text-muted {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
  }

  .modal-actions {
    display: flex;
    gap: 10px;
  }
</style>
