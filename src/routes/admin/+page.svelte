<script>
  import { onMount } from "svelte";
  import OrderStatusBadge from "$lib/components/OrderStatusBadge.svelte";
  import CustomDropdown from "$lib/components/CustomDropdown.svelte";
  import { formatCurrency } from "$lib/utils.js";

  // ── API Config ──────────────────────────────────────────────────────────────
  const BASE_URL =
    "https://script.google.com/macros/s/AKfycbxc8jeXwQ9FyFWIdhGmPZ7I674wt8wyjFkG1fdp0CP_AwLEJYXMdJcVgxAwu0YRQl3adA/exec";
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
  let orders = $state(/** @type {any[]} */ ([]));
  let loading = $state(true);
  let error = $state(/** @type {string|null} */ (null));

  let unlocked = $state(false);
  let adminPassInput = $state("");
  let authError = $state("");

  let actionMsg = $state("");
  let actionErr = $state("");

  // ── Modal state ─────────────────────────────────────────────────────────────
  /** @type {any|null} */
  let editingOrder = $state(null);
  let editStatus = $state("");
  let editTracking = $state("");
  let editUUID = $state("");
  let editSaving = $state(false);

  // ── Data Loading ─────────────────────────────────────────────────────────────
  async function loadData() {
    loading = true;
    error = null;
    try {
      const res = await fetch(`${BASE_URL}?action=getOrders&key=${SECRET_KEY}`);
      if (!res.ok) throw new Error("API Fetch Failed");
      const data = await res.json();

      orders = data
        .map((/** @type {any} */ order, /** @type {number} */ index) => ({
          ...order,
          id: order.id || order["List UUID"] || `order-${index}`,
          rowIndex: order.rowIndex ?? index + 2,
        }))
        .sort(
          (/** @type {any} */ a, /** @type {any} */ b) =>
            (b.Timestamp || b.timestamp || "").localeCompare(
              a.Timestamp || a.timestamp || "",
            ),
        );
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

  // ── Derived ──────────────────────────────────────────────────────────────────
  let inProgressOrders = $derived(
    orders.filter(
      (o) =>
        (o.Status || o.status) !== "Received" &&
        (o.Status || o.status) !== "Denied" &&
        (o.Status || o.status) !== "Cancelled",
    ),
  );

  // ── Modal helpers ─────────────────────────────────────────────────────────────
  function openEdit(/** @type {any} */ order) {
    editingOrder = order;
    editStatus = order.Status || order.status || "Submitted and in review";
    editTracking = order.Tracking || order.tracking || "";
    editUUID = order["List UUID"] || order.orderUUID || "";
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
        rowIndex: editingOrder.rowIndex,
        status: editStatus,
        tracking: editTracking,
        orderUUID: editUUID,
      });
      const res = await fetch(`${BASE_URL}?${params.toString()}`);
      const result = await res.json();
      if (!res.ok || result?.error)
        throw new Error(result?.error || "Update failed");

      actionMsg = `✓ "${editingOrder.Item || editingOrder.item}" updated!`;
      closeEdit();
      await loadData();
    } catch (e) {
      actionErr = e instanceof Error ? e.message : "Update failed";
    } finally {
      editSaving = false;
    }
  }

  // Generate a stable hue from an order UUID (matches orders page)
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
            bind:value={adminPassInput}
            placeholder="Enter admin password"
            autocomplete="current-password"
            required
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
      <button
        class="btn btn-ghost btn-sm"
        onclick={loadData}
        disabled={loading}
      >
        <span class:spinning={loading}>↻</span> Refresh
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
      In-Progress Orders ({inProgressOrders.length})
    </div>
    <p class="text-muted" style="margin-bottom:16px;font-size:0.875rem">
      Click <strong>Edit</strong> on any row to update status, UUID, or tracking. Sorted newest first.
    </p>

    <div class="card" style="padding:0;overflow:hidden">
      {#if loading && !orders.length}
        <div class="empty-state">
          <span class="spinning">↻</span> Loading orders…
        </div>
      {:else if inProgressOrders.length === 0}
        <div class="empty-state">
          <div class="icon">✅</div>
          All orders processed! No pending orders.
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
                <th class="text-right">Order ID</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {#each inProgressOrders as order (order.id)}
                {@const orderColor = getOrderColor(
                  order["List UUID"] || order.orderUUID,
                )}
                <tr class="fade-in" style="border-left: 4px solid {orderColor}">
                  <td>
                    <div style="font-weight:500">
                      {#if order.Link || order.link}
                        <a
                          href={order.Link || order.link}
                          target="_blank"
                          rel="noopener">{order.Item || order.item}</a
                        >
                      {:else}
                        {order.Item || order.item}
                      {/if}
                    </div>
                    {#if order.Notes || order.notes}
                      <div style="font-size:0.78rem;color:var(--text-muted)">
                        {order.Notes || order.notes}
                      </div>
                    {/if}
                  </td>
                  <td>{order.Company || order.company || "—"}</td>
                  <td>
                    <span class="badge badge-{(order.Category || order.category || '').toLowerCase()}"
                      >{order.Category || order.category || "—"}</span
                    >
                  </td>
                  <td>{order.Team || order.team || "—"}</td>
                  <td class="text-muted"
                    >{(order.Timestamp || order.timestamp || "")
                      .slice(0, 10) || "—"}</td
                  >
                  <td class="text-right monospace"
                    >{formatCurrency(
                      Number(order.Price || order.price) || 0,
                    )}</td
                  >
                  <td class="text-right"
                    >{order.Quantity || order.quantity || "—"}</td
                  >
                  <td class="text-right monospace" style="font-weight:600"
                    >{formatCurrency(Number(order.Total || order.total) || 0)}</td
                  >
                  <td
                    ><OrderStatusBadge
                      status={order.Status ||
                        order.status ||
                        "Submitted and in review"}
                    /></td
                  >
                  <td class="text-right monospace" style="font-size:0.72rem;color:var(--text-muted)"
                    >{order["List UUID"] || order.orderUUID || "—"}</td
                  >
                  <td>
                    <button
                      class="btn btn-primary btn-xs"
                      onclick={() => openEdit(order)}
                    >
                      Edit
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
  <div class="modal-backdrop" onclick={closeEdit} onkeydown={(e) => e.key === 'Escape' && closeEdit()} role="button" tabindex="0" aria-label="Close modal">
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
            {editingOrder.Item || editingOrder.item}
          </p>
        </div>
        <button class="modal-close" onclick={closeEdit} aria-label="Close">✕</button>
      </div>

      {#if actionErr}
        <div class="error-bar" style="margin-bottom:16px">{actionErr}</div>
      {/if}

      <form
        onsubmit={(e) => {
          e.preventDefault();
          saveEdit();
        }}
        id="edit-order-form"
      >
        <div class="modal-fields">
          <div class="form-group">
            <label for="edit-status">Status</label>
            <CustomDropdown
              options={ORDER_STATUSES}
              bind:value={editStatus}
            />
          </div>

          <div class="form-group">
            <label for="edit-uuid">Order UUID</label>
            <input
              id="edit-uuid"
              type="text"
              bind:value={editUUID}
              placeholder="e.g. ORD-2026-001"
            />
          </div>

          <div class="form-group" style="grid-column: 1 / -1">
            <label for="edit-tracking">Tracking Link / Number</label>
            <input
              id="edit-tracking"
              type="text"
              bind:value={editTracking}
              placeholder="e.g. https://track.ups.com/... or 1Z999AA10123456784"
            />
          </div>
        </div>

        <!-- Order details summary -->
        <div class="order-summary">
          <div class="summary-row">
            <span class="text-muted">Company</span>
            <span>{editingOrder.Company || editingOrder.company || "—"}</span>
          </div>
          <div class="summary-row">
            <span class="text-muted">Team</span>
            <span>{editingOrder.Team || editingOrder.team || "—"}</span>
          </div>
          <div class="summary-row">
            <span class="text-muted">Category</span>
            <span>{editingOrder.Category || editingOrder.category || "—"}</span>
          </div>
          <div class="summary-row">
            <span class="text-muted">Total</span>
            <span class="monospace" style="font-weight:700;color:#6bcb77"
              >{formatCurrency(
                Number(editingOrder.Total || editingOrder.total) || 0,
              )}</span
            >
          </div>
          <div class="summary-row">
            <span class="text-muted">Date</span>
            <span
              >{(editingOrder.Timestamp || editingOrder.timestamp || "")
                .slice(0, 10) || "—"}</span
            >
          </div>
          {#if editingOrder.Notes || editingOrder.notes}
            <div class="summary-row" style="grid-column:1/-1">
              <span class="text-muted">Notes</span>
              <span>{editingOrder.Notes || editingOrder.notes}</span>
            </div>
          {/if}
        </div>

        <div class="modal-actions">
          <button type="submit" class="btn btn-primary" disabled={editSaving}>
            {editSaving ? "Saving…" : "Save Changes"}
          </button>
          <button
            type="button"
            class="btn btn-ghost"
            onclick={closeEdit}
            disabled={editSaving}
          >
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
  .lock-icon {
    font-size: 3rem;
    margin-bottom: 20px;
  }

  .unlocked-badge {
    font-size: 0.75rem;
    font-weight: 700;
    color: #6bcb77;
    background: rgba(107, 203, 119, 0.1);
    padding: 4px 10px;
    border-radius: 99px;
    border: 1px solid rgba(107, 203, 119, 0.3);
  }

  /* ── Table ────────────────────────────────────────────────────────────────── */
  .btn-xs {
    font-size: 0.7rem;
    padding: 3px 10px;
    white-space: nowrap;
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
    animation: fadeIn 0.15s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal-card {
    width: 100%;
    max-width: 560px;
    padding: 32px;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
    animation: slideUp 0.2s ease;
    max-height: 90vh;
    overflow-y: auto;
  }

  @keyframes slideUp {
    from {
      transform: translateY(16px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
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
    transition: color 0.15s, background 0.15s;
  }
  .modal-close:hover {
    color: var(--text);
    background: var(--surface-2);
  }

  .modal-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;
  }

  @media (max-width: 480px) {
    .modal-fields {
      grid-template-columns: 1fr;
    }
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
