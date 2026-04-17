<script>
  import { onMount } from "svelte";
  import OrderStatusBadge from "$lib/components/OrderStatusBadge.svelte";
  import CustomDropdown from "$lib/components/CustomDropdown.svelte";
  import LoadingIndicator from "$lib/components/LoadingIndicator.svelte";
  import AdminLock from "$lib/components/AdminLock.svelte";
  import { formatCurrency, formatFullDate, formatDate } from "$lib/utils.js";
  import { dataService } from "$lib/dataService.svelte.js";
  import { BASE_URL, SECRET_KEY } from "$lib/config.js";

  /** @typedef {import('$lib/dataService.svelte.js').Order} Order */


  const ORDER_STATUSES = [
    "Pending Review",
    "Approved",
    "Ordered",
    "Received",
    "Denied",
    "Cancelled",
  ];

  // ── State ───────────────────────────────────────────────────────────────────
  let syncing = $state(false);

  /** @type {Record<string, number>} */
  const STATUS_PRIORITY = {
    "pending review": 0,
    "approved": 1,
    "ordered": 2,
    "received": 3,
    "denied": 4,
    "cancelled": 5,
  };

  let sortedAdminOrders = $derived.by(() => {
    return dataService.orders.slice().sort((a, b) => {
      let pA = STATUS_PRIORITY[(a.status || "").toLowerCase().trim()] ?? 99;
      let pB = STATUS_PRIORITY[(b.status || "").toLowerCase().trim()] ?? 99;
      if (pA !== pB) return pA - pB;
      let tA = new Date(a.timestamp || 0).getTime();
      let tB = new Date(b.timestamp || 0).getTime();
      return tB - tA;
    });
  });

  let unlocked = $state(false);

  async function sync() {
    syncing = true;
    await dataService.load(true);
    syncing = false;
  }

  let actionMsg = $state("");
  let actionErr = $state("");

  // ── Modal state ─────────────────────────────────────────────────────────────
  /** @type {Order|null} */
  let editingOrder = $state(null);
  let editStatus = $state("");
  let editTracking = $state("");
  let editUUID = $state("");
  let editSaving = $state(false);
  let showDeleteConfirm = $state(false);
  let deleteSaving = $state(false);

  // ── Funding Edit State ──────────────────────────────────────────────────────
  let editingFund = $state(null);
  let editFundFields = $state({
    Source: "",
    Amount: 0,
    Recipient: "",
    Notes: "",
    Type: "",
    Date: "",
  });
  let activeView = $state("orders"); // "orders" | "funding" | "master"

  let masterTransactions = $derived.by(() => {
    /** @type {any[]} */
    const arr = [];

    // Expenses (Ordered, Received, Approved)
    const expenses = dataService.orders.filter((/** @type {Order} */ o) => {
      const s = o.status?.toLowerCase().trim();
      return s === "received" || s === "ordered" || s === "approved";
    });
    for (let e of expenses) {
      arr.push({
        id: e.id,
        type: "Expense",
        source: e.company || e.item,
        category: e.category,
        date: e.timestamp?.slice(0, 10) || "—",
        amount: -e.total,
        status: e.status,
      });
    }

    // Income
    for (let f of dataService.funds) {
      arr.push({
        id: f.id,
        type: "Income",
        source: f.Source,
        category: f.Type,
        date: f.Date || "—",
        amount: Number(f.Amount) || 0,
        status: "Received",
      });
    }

    arr.sort((a, b) => {
      const dateA = new Date(a.date).getTime() || 0;
      const dateB = new Date(b.date).getTime() || 0;
      return dateB - dateA;
    });
    return arr;
  });

  // ── Data Loading ─────────────────────────────────────────────────────────────
  onMount(() => {
    dataService.load(); // Uses persistent cache for instant load
  });





  // ── Modal helpers ─────────────────────────────────────────────────────────────
  function openEdit(/** @type {Order} */ order) {
    editingOrder = order;
    editStatus = order.status || "Pending Review";
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
  
  function requestDelete() {
    showDeleteConfirm = true;
  }

  function cancelDelete() {
    showDeleteConfirm = false;
  }

  async function deleteOrder() {
    if (!editingOrder) return;
    deleteSaving = true;
    actionErr = "";
    try {
      const params = new URLSearchParams({
        action: "deleteOrder", 
        key: SECRET_KEY,
        uuid: editingOrder.orderUUID
      });
      const res = await fetch(`${BASE_URL}?${params.toString()}`);
      
      // If we get an error response, try to parse it
      let result;
      const text = await res.text();
      try {
        result = JSON.parse(text);
      } catch (parseErr) {
        throw new Error(`Server returned invalid response: ${text.slice(0, 100)}`);
      }

      if (!res.ok || result?.error) {
        let msg = result?.error || "Delete failed";
        if (msg.toLowerCase().includes("invalid action")) {
          msg = "Backend Error: 'deleteOrder' action not found. Please ensure the GAS script has been updated and redeployed with the delete handler.";
        }
        throw new Error(msg);
      }
      
      actionMsg = "✓ Order completely removed from Spreadsheet!";
      
      // 🔥 Optimistic UI Update: Remove from local state immediately
      const idToDelete = editingOrder?.orderUUID;
      if (idToDelete) {
        dataService.orders = dataService.orders.filter(o => o.orderUUID !== idToDelete);
        dataService.persist(); // Sync to local storage immediately
      }

      editingOrder = null;
      
      // Perform background re-sync to be 100% sure everything matches (silent)
      dataService.load(true, true);
    } catch (e) {
      actionErr = e instanceof Error ? e.message : "Delete failed";
      console.error("Delete Order Error:", e);
    } finally {
      deleteSaving = false;
      showDeleteConfirm = false;
    }
  }

  function exportMasterCSV() {
    if (!masterTransactions || !masterTransactions.length) return;
    const headers = ["Date", "Type", "Source/Item", "Category", "Status", "Amount"];
    const csvRows = [headers.join(',')];
    for (const row of masterTransactions) {
      const values = [
        row.date, row.type, row.source, row.category, row.status, row.amount
      ].map(val => `"${String(val || '').replace(/"/g, '""')}"`);
      csvRows.push(values.join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `westwood_finance_master_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Generate a stable hue from an order UUID
  function getOrderColor(/** @type {string|undefined} */ uuid) {
    if (!uuid) return "var(--border)";
    let hash = 0;
    for (let i = 0; i < uuid.length; i++) {
      hash = uuid.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 65%, 45%)`;
  }

  // ── Funding Edit Helpers ──────────────────────────────────────────────────────
  /**
   * @param {any} fund
   */
  function openEditFund(fund) {
    editingFund = fund;
    editFundFields = {
      Source: fund.Source || "",
      Amount: fund.Amount || 0,
      Recipient: fund.Recipient || "",
      Notes: fund.Notes || "",
      Type: fund.Type || "Part Order",
      Date: fund.Date || new Date().toISOString().split("T")[0],
    };
    actionMsg = "";
    actionErr = "";
  }

  async function saveFundEdit() {
    if (!editingFund) return;
    const currentFund = /** @type {any} */ (editingFund);
    editSaving = true;
    actionErr = "";
    try {
      const params = new URLSearchParams({
        action: "updateFunding",
        key: SECRET_KEY,
        rowIndex: String(currentFund.rowIndex),
        Source: String(editFundFields.Source),
        Amount: String(editFundFields.Amount),
        Recipient: String(editFundFields.Recipient),
        Notes: String(editFundFields.Notes),
        Type: String(editFundFields.Type),
        Date: formatDate(editFundFields.Date),
      });
      const res = await fetch(`${BASE_URL}?${params.toString()}`);
      const result = await res.json();
      if (!res.ok || result?.error)
        throw new Error(result?.error || "Update failed");

      actionMsg = `✓ Funding entry updated!`;
      editingFund = null;
      await dataService.load(true);
    } catch (e) {
      actionErr = e instanceof Error ? e.message : "Update failed";
    } finally {
      editSaving = false;
    }
  }
</script>

<svelte:head>
  <title>Admin Dashboard — Westwood Finance</title>
</svelte:head>

{#if !unlocked}
  <AdminLock 
    onunlock={() => { unlocked = true; }} 
    title="Admin Portal" 
    description="Enter the admin password to manage orders and funding."
  />
{:else}
  <div class="page-header">
    <div class="header-left">
      <h1>Admin <span>Portal</span></h1>
      <p class="text-muted">Westwood Robotics Resource & Procurement Control</p>
    </div>

    <div class="header-right" style="display: flex; align-items: center; gap: 12px;">
      <button class="btn btn-ghost btn-sm" onclick={sync} disabled={syncing}>
        <span class:spinning={syncing}>↻</span>
        {syncing ? "Syncing..." : "Refresh"}
      </button>
      

      
      <button class="btn btn-ghost btn-sm" style="color: var(--primary);" onclick={() => unlocked = false}>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Lock
      </button>
    </div>
  </div>

  <!-- ── Tab Nav ──────────────────────────────────────────────────────── -->
  <div class="tabs-wrapper" style="margin-bottom: 32px;">
    <div class="segmented-control" style="width: auto; min-width: 360px; margin: 0 auto; position: relative;">
      <div
        class="segment-highlight"
        style="transform: translateX(calc({['orders', 'funding', 'master'].indexOf(activeView)} * 100%));"
      ></div>
      <button
        class="segment"
        class:active={activeView === "orders"}
        onclick={() => (activeView = "orders")}
      >
        Orders
      </button>
      <button
        class="segment"
        class:active={activeView === "funding"}
        onclick={() => (activeView = "funding")}
      >
        Funding
      </button>
      <button
        class="segment"
        class:active={activeView === "master"}
        onclick={() => (activeView = "master")}
      >
        Finance History
      </button>
    </div>
  </div>

  {#if actionMsg}
    <div class="success-bar message-bar">{actionMsg}</div>
  {/if}
  {#if actionErr}
    <div class="error-bar message-bar">{actionErr}</div>
  {/if}

    {#if activeView === "orders"}
      <section class="fade-in">
        <div class="section-title" style="margin-bottom:12px; display: flex; justify-content: space-between; align-items: center;">
          <span>Order History ({dataService.orders.length})</span>
        </div>
      <p class="text-muted" style="margin-bottom:16px;font-size:0.875rem">
        Manage order statuses, UUIDs, and tracking links. Updates sync directly
        to Google Sheets.
      </p>

      <div class="card orders-card" style="padding:0;overflow:hidden">
        {#if dataService.loading && !dataService.orders.length}
          <LoadingIndicator text="Loading procurement backlog..." />
        {:else if dataService.orders.length === 0}
          <div class="empty-state fade-in">
            <div class="icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
            </div>
            <h3>No requests on file</h3>
            <p>New procurement requests will appear here for administrative action.</p>
          </div>
        {:else}
          <div class="table-wrap" style="border: none; border-radius: 0;">
            <table>
              <thead>
                <tr>
                  <th style="padding-left: 24px;">Provision/Item</th>
                  <th>Category</th>
                  <th>Team</th>
                  <th>Submission Date</th>
                  <th class="text-right">Investment</th>
                  <th>Status</th>
                  <th class="text-right" style="padding-right: 24px;"></th>
                </tr>
              </thead>
              <tbody>
                {#each sortedAdminOrders as order (order.id)}
                  {@const orderColor = getOrderColor(order.orderUUID)}
                  <tr class="fade-in group-row" style="--group-color: {orderColor}">
                    <td style="padding-left: 24px;">
                      <div class="item-primary">
                        {#if order.link}
                          <a href={order.link} target="_blank" rel="noopener">{order.item}</a>
                        {:else}
                          {order.item}
                        {/if}
                      </div>
                      {#if order.company || order.notes}
                        <div class="item-secondary">
                          {order.company || ''} {order.notes ? `· ${order.notes}` : ''}
                        </div>
                      {/if}
                    </td>
                    <td>
                      <span class="badge badge-{(order.category || '').toLowerCase()}">
                        {order.category || "—"}
                      </span>
                    </td>
                    <td>{order.team || "—"}</td>
                    <td class="text-dim">{formatFullDate(order.timestamp)}</td>
                    <td class="text-right monospace amount">
                      {formatCurrency(order.total)}
                    </td>
                    <td><OrderStatusBadge status={order.status} /></td>
                    <td class="text-right" style="padding-right: 24px;">
                      <button class="btn btn-primary btn-sm" onclick={() => openEdit(order)}>
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
  {:else if activeView === "funding"}
    <!-- ── Funding Management ────────────────────────────────────────────────── -->
    <section class="fade-in">
      <div class="section-title" style="margin-bottom:12px">
        Manage Funding & Grants ({dataService.funds.length})
      </div>
      <p class="text-muted" style="margin-bottom:16px;font-size:0.875rem">
        Edit funding sources, amounts, and recipients. These changes sync to the
        Fundraising sheet.
      </p>

      <div class="card" style="padding:0;overflow:hidden">
        {#if dataService.loading && !dataService.funds.length}
          <LoadingIndicator text="Loading funds..." />
        {:else if dataService.funds.length === 0}
          <div class="empty-state">
            <div class="icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
            </div>
            No funding entries found.
          </div>
        {:else}
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Source</th>
                  <th>Team</th>
                  <th>Date</th>
                  <th class="text-right">Amount</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {#each dataService.funds as fund (fund.id)}
                  <tr class="fade-in">
                    <td><span class="type-tag">{fund.Type || "—"}</span></td>
                    <td style="font-weight:500">{fund.Source || "—"}</td>
                    <td>{fund.Recipient || "—"}</td>
                    <td class="text-dim" style="font-size:0.875rem; color: var(--text-dim);">{formatFullDate(fund.Date)}</td>
                    <td
                      class="text-right monospace"
                      style="font-weight:600;color:#6bcb77"
                      >{formatCurrency(fund.Amount)}</td
                    >
                    <td class="text-muted" style="font-size:0.8rem"
                      >{fund.Notes || "—"}</td
                    >
                    <td>
                      <button
                        class="btn btn-primary btn-sm"
                        onclick={() => openEditFund(fund)}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
              <tfoot>
                <tr style="border-top: 2px solid var(--border);">
                  <td colspan="4" style="font-weight: 700; text-align: right; color: var(--text-muted); text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; padding: 12px 16px;">Total Funding</td>
                  <td class="text-right monospace" style="color:#6bcb77; font-weight: 700; font-size: 1rem; padding: 12px 16px;">
                    {formatCurrency(dataService.funds.reduce((sum, f) => sum + (Number(f.Amount) || 0), 0))}
                  </td>
                  <td colspan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        {/if}
      </div>
    </section>
  {:else if activeView === "master"}
    <section class="fade-in">
      <div class="section-title" style="margin-bottom:12px; display: flex; justify-content: space-between; align-items: center;">
        <span>Full Finance History ({masterTransactions.length})</span>
        <button class="btn btn-ghost btn-sm" onclick={exportMasterCSV} disabled={!masterTransactions.length}>
          ↓ Export CSV
        </button>
      </div>
      <p class="text-muted" style="margin-bottom:16px;font-size:0.875rem">
        Combined view of all finalized inbound (Funding) and outbound
        (Approved/Ordered/Received) transactions.
      </p>

      <div class="card orders-card" style="padding:0;overflow:hidden">
        {#if dataService.loading && !masterTransactions.length}
          <LoadingIndicator text="Loading ledger..." />
        {:else if masterTransactions.length === 0}
          <div class="empty-state">
            <div class="icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></svg>
            </div>
            No transactions found.
          </div>
        {:else}
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Source / Item</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {#each masterTransactions as tx (tx.id + tx.type)}
                  <tr class="fade-in">
                    <td class="text-dim monospace" style="color: var(--text-dim);">{tx.date}</td>
                    <td style="font-weight:600; color: #fff;">{tx.source || "—"}</td>
                    <td>
                      <span
                        class="badge {tx.type === 'Income'
                          ? 'badge-awarded'
                          : 'badge-rejected'}"
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td>{tx.category || "—"}</td>
                    <td><OrderStatusBadge status={tx.status} /></td>
                    <td
                      class="text-right monospace"
                      style="font-weight:700; color: {tx.amount > 0
                        ? 'var(--status-awarded)'
                        : 'var(--status-rejected)'}"
                    >
                      {tx.amount > 0 ? "+" : ""}{formatCurrency(tx.amount)}
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
{/if}

<!-- ── Funding Edit Modal ──────────────────────────────────────────────────────── -->
{#if editingFund}
  {@const currentFund = /** @type {any} */ (editingFund)}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
  <div
    class="modal-backdrop"
    onclick={() => (editingFund = null)}
    onkeydown={(e) => e.key === "Escape" && (editingFund = null)}
    role="button"
    tabindex="0"
  >
    <div
      class="modal-card card"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      tabindex="-1"
    >
      <div class="modal-header">
        <div>
          <h2 style="margin:0">Edit Funding Entry</h2>
          <p class="text-muted" style="margin:4px 0 0;font-size:0.85rem">
            {currentFund.Source}
          </p>
        </div>
        <button class="modal-close" onclick={() => (editingFund = null)}
          >✕</button
        >
      </div>

      {#if actionErr}<div class="error-bar">{actionErr}</div>{/if}

      <form
        onsubmit={(e) => {
          e.preventDefault();
          saveFundEdit();
        }}
      >
        <div class="modal-fields">
          <div class="form-group">
            <label for="fund-source">Source</label>
            <input id="fund-source" bind:value={editFundFields.Source} />
          </div>
          <div class="form-group">
            <label for="fund-amount">Amount</label>
            <input
              id="fund-amount"
              type="number"
              step="0.01"
              bind:value={editFundFields.Amount}
            />
          </div>
          <div class="form-group">
            <label for="fund-recipient">Recipient / Team</label>
            <input id="fund-recipient" bind:value={editFundFields.Recipient} />
          </div>
          <div class="form-group">
            <label for="fund-date">Date</label>
            <input
              id="fund-date"
              type="date"
              bind:value={editFundFields.Date}
            />
          </div>
          <div class="form-group" style="grid-column: 1 / -1">
            <label for="fund-notes">Notes</label>
            <textarea id="fund-notes" bind:value={editFundFields.Notes}
            ></textarea>
          </div>
        </div>

        <div class="modal-actions">
          <button type="submit" class="btn btn-primary" disabled={editSaving}>
            {editSaving ? "Saving…" : "Save Entry"}
          </button>
          <button
            type="button"
            class="btn btn-ghost"
            onclick={() => (editingFund = null)}>Cancel</button
          >
        </div>
      </form>
    </div>
  </div>
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
        <button class="modal-close" onclick={closeEdit} aria-label="Close"
          >✕</button
        >
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
            <CustomDropdown options={ORDER_STATUSES} bind:value={editStatus} />
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
              placeholder="e.g. UPS/Status..."
            />
          </div>
        </div>

        <div class="order-summary">
          <div class="summary-row">
            <span>Company</span><span>{editingOrder.company || "—"}</span>
          </div>
          <div class="summary-row">
            <span>Team</span><span>{editingOrder.team || "—"}</span>
          </div>
          <div class="summary-row">
            <span>Category</span><span>{editingOrder.category || "—"}</span>
          </div>
          <div class="summary-row">
            <span>Total</span><span>{formatCurrency(editingOrder.total)}</span>
          </div>
        </div>

        <div class="modal-actions" style="display: flex; justify-content: space-between; width: 100%;">
          <button type="button" class="btn btn-ghost" style="color: var(--primary);" onclick={requestDelete} disabled={editSaving}>
            Delete Order
          </button>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn btn-ghost" onclick={closeEdit} disabled={editSaving}>
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" disabled={editSaving}>
              {editSaving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- ── Delete Confirmation Modal ────────────────────────────────────────────── -->
{#if showDeleteConfirm}
  <div class="modal-backdrop fade-in" style="z-index: 1100;">
    <div class="card modal-card" style="width: 100%; max-width: 360px; padding: 32px; text-align: center; border: 1px solid rgba(239, 68, 68, 0.2);">
      <div class="icon" style="font-size: 2.5rem; margin-bottom: 20px;">⚠️</div>
      <h3 style="margin-bottom: 12px; color: var(--text);">Delete Order?</h3>
      <p class="text-muted" style="font-size: 0.9rem; margin-bottom: 24px; line-height: 1.5;">
        Are you sure you want to permanently delete <strong>{editingOrder?.item}</strong>? This action cannot be undone.
      </p>
      
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <button 
          class="btn" 
          style="background: #ef4444; color: white; border: none;" 
          onclick={deleteOrder} 
          disabled={deleteSaving}
        >
          {#if deleteSaving}
            <span>Deleting<span class="dot-loading"></span></span>
          {:else}
            Yes, Delete Permanently
          {/if}
        </button>
        <button 
          class="btn btn-ghost" 
          onclick={cancelDelete} 
          disabled={deleteSaving}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .lock-screen {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
    padding: 40px 20px;
  }

  .lock-card {
    width: 100%;
    max-width: 380px;
    min-height: 520px;
    padding: 60px 40px;
    text-align: center;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: 0 40px 100px rgba(0, 0, 0, 0.6);
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 12px;
  }
  .btn-block { width: 100%; justify-content: center; height: 48px; font-size: 0.95rem; }

  .segmented-control {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    background: var(--surface-2);
    padding: 4px;
    border-radius: 99px;
    border: 1px solid var(--border);
    position: relative;
    gap: 0;
  }
  .segment-highlight {
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: 4px;
    width: calc((100% - 8px) / 3);
    background: var(--surface);
    border-radius: 99px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    z-index: 1;
  }
  .segment {
    position: relative;
    z-index: 2;
    background: transparent;
    border: none;
    padding: 8px 18px;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-muted);
    border-radius: 99px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
  }

  .segment:hover {
    color: var(--text);
  }
  .segment.active {
    color: var(--primary);
  }

  /* Table Customizations for Admin */
  .item-primary { font-weight: 700; color: #fff; font-size: 0.9rem; }
  .item-secondary { font-size: 0.75rem; color: var(--text-dim); margin-top: 2px; }
  .amount { font-weight: 700; color: #fff; }

  .message-bar { display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-radius: var(--radius-sm); font-size: 0.9rem; font-weight: 600; margin-bottom: 24px; border: 1px solid transparent; }
  .success-bar { background: rgba(16, 185, 129, 0.08); border-color: rgba(16, 185, 129, 0.2); color: var(--status-received); }
  .error-bar { background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.2); color: var(--status-rejected); }

  /* Modal Refined */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(8px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .modal-card {
    width: 100%;
    max-width: 520px;
    padding: 40px;
    box-shadow: var(--shadow-2xl);
    border: 1px solid var(--border);
    animation: modal-enter 0.3s cubic-bezier(0.16, 1, 0.3, 1);
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


  .modal-actions {
    display: flex;
    gap: 10px;
  }

  /* ── Dot Loading Animation ────────────────────────────────────────────────── */
  .dot-loading {
    display: inline-block;
    width: 1.5em;
    text-align: left;
    animation: dots 1.5s steps(4, end) infinite;
  }

  @keyframes dots {
    0%, 20% { content: ""; }
    40% { content: "."; }
    60% { content: ".."; }
    80%, 100% { content: "..."; }
  }

  /* Note: The above keyframes using 'content' only works on pseudo-elements. 
     For regular text, we use a slightly different approach or just manual dots. 
     I'll use pseudo-elements for better effect. */
  .dot-loading::after {
    content: "...";
    animation: dots-pseudo 1.5s steps(4, end) infinite;
  }

  @keyframes dots-pseudo {
    0%, 20% { content: ""; }
    40% { content: "."; }
    60% { content: ".."; }
    80%, 100% { content: "..."; }
  }
</style>
