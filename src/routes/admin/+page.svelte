<script>
  import { onMount } from "svelte";
  import OrderStatusBadge from "$lib/components/OrderStatusBadge.svelte";
  import CustomDropdown from "$lib/components/CustomDropdown.svelte";
  import LoadingIndicator from "$lib/components/LoadingIndicator.svelte";
  import { formatCurrency, formatFullDate } from "$lib/utils.js";
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

  async function sync() {
    syncing = true;
    await dataService.load(true);
    syncing = false;
  }

  function tryUnlock() {
    const cleanPass = adminPassInput.trim();
    if (cleanPass === "/dev3432" || cleanPass === "dev3432") {
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
        Date: String(editFundFields.Date),
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
  <!-- ── Lock Screen ──────────────────────────────────────────────────────── -->
  <div class="lock-screen">
    <div class="lock-card card">
      <div
        class="lock-logo"
        style="width: 80px; height: 80px; margin: 0 auto 24px; border-radius: 50%; overflow: hidden; border: 2px solid rgba(255, 255, 255, 0.95); background: #000; box-shadow: 0 0 15px rgba(255, 255, 255, 0.1);"
      >
        <img
          src="/logo.png"
          alt="Westwood Logo"
          style="width: 100%; height: 100%; object-fit: cover;"
        />
      </div>
      <h1>Admin Console Access</h1>
      <p class="text-muted" style="margin-bottom:24px;font-size:0.9rem">
        Enter the admin password to access restricted areas.
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
  <div class="admin-header">
    <div class="header-content">
      <div class="header-top">
        <h1>Admin <span class="accent-color">Console</span></h1>

        <div class="header-actions">
          <button
            class="btn btn-ghost btn-sm"
            onclick={sync}
            disabled={syncing}
          >
            <span class:spinning={syncing}>↻</span>
            {syncing ? "Syncing..." : "Refresh Data"}
          </button>
        </div>
      </div>

      <div class="tabs-container">
        <div class="segmented-control">
          <div
            class="segment-highlight"
            style="transform: translateX(calc({activeView === 'orders'
              ? 0
              : activeView === 'funding'
                ? 1
                : 2} * 100%)); width: calc((100% - 8px) / 3);"
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
            Master Finance
          </button>
        </div>
      </div>
    </div>
  </div>

  {#if actionMsg}
    <div class="success-bar">{actionMsg}</div>
  {/if}
  {#if actionErr}
    <div class="error-bar">{actionErr}</div>
  {/if}

  {#if activeView === "orders"}
    <section class="fade-in">
      <div class="section-title" style="margin-bottom:12px; display: flex; justify-content: space-between; align-items: center;">
        <span>Manage All Orders ({dataService.orders.length})</span>
      </div>
      <p class="text-muted" style="margin-bottom:16px;font-size:0.875rem">
        Manage order statuses, UUIDs, and tracking links. Updates sync directly
        to Google Sheets.
      </p>

      <div class="card orders-card" style="padding:0;overflow:hidden">
        {#if dataService.loading && !dataService.orders.length}
          <LoadingIndicator text="Loading orders..." />
        {:else if dataService.orders.length === 0}
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
                {#each sortedAdminOrders as order (order.id)}
                  {@const orderColor = getOrderColor(order.orderUUID)}
                  <tr
                    class="fade-in group-row"
                    style="--group-color: {orderColor}"
                  >
                    <td>
                      <div style="font-weight:500">
                        {#if order.link}
                          <a href={order.link} target="_blank" rel="noopener"
                            >{order.item}</a
                          >
                        {:else}
                          {order.item}
                        {/if}
                      </div>
                      {#if order.notes}
                        <div style="font-size:0.78rem;color:var(--text-muted)">
                          {order.notes}
                        </div>
                      {/if}
                    </td>
                    <td>{order.company || "—"}</td>
                    <td>
                      <span
                        class="badge badge-{(
                          order.category || ''
                        ).toLowerCase()}"
                      >
                        {order.category || "—"}
                      </span>
                    </td>
                    <td>{order.team || "—"}</td>
                    <td class="text-muted" style="font-size:0.875rem"
                      >{formatFullDate(order.timestamp)}</td
                    >
                    <td class="text-right monospace"
                      >{formatCurrency(order.price)}</td
                    >
                    <td class="text-right">{order.quantity || "—"}</td>
                    <td class="text-right monospace" style="font-weight:600">
                      {formatCurrency(order.total)}
                    </td>
                    <td><OrderStatusBadge status={order.status} /></td>
                    <td
                      class="text-right monospace"
                      style="font-size:0.72rem;color:var(--text-muted)"
                    >
                      {order.orderUUID || "—"}
                    </td>
                    <td>
                      <button
                        class="btn btn-primary btn-edit"
                        onclick={() => openEdit(order)}
                      >
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
            <div class="icon">💰</div>
            No funding entries found.
          </div>
        {:else}
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Source</th>
                  <th>Recipient</th>
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
                    <td class="text-muted" style="font-size:0.875rem">{formatFullDate(fund.Date)}</td>
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
                        class="btn btn-primary btn-edit"
                        onclick={() => openEditFund(fund)}
                      >
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
  {:else if activeView === "master"}
    <!-- ── Master Finance Management ─────────────────────────────────────────── -->
    <section class="fade-in">
      <div class="section-title" style="margin-bottom:12px; display: flex; justify-content: space-between; align-items: center;">
        <span>Master Finance Ledger ({masterTransactions.length})</span>
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
            <div class="icon">🧾</div>
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
                    <td class="text-muted">{tx.date}</td>
                    <td style="font-weight:500">{tx.source || "—"}</td>
                    <td>
                      <span
                        class="badge {tx.type === 'Income'
                          ? 'badge-hardware'
                          : 'badge-software'}"
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td>{tx.category || "—"}</td>
                    <td><OrderStatusBadge status={tx.status} /></td>
                    <td
                      class="text-right monospace"
                      style="font-weight:600; color: {tx.amount > 0
                        ? '#6bcb77'
                        : '#f16a4e'}"
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
            <span class="text-muted">Company</span><span
              >{editingOrder.company || "—"}</span
            >
          </div>
          <div class="summary-row">
            <span class="text-muted">Team</span><span
              >{editingOrder.team || "—"}</span
            >
          </div>
          <div class="summary-row">
            <span class="text-muted">Category</span><span
              >{editingOrder.category || "—"}</span
            >
          </div>
          <div class="summary-row">
            <span class="text-muted">Total</span><span
              class="monospace"
              style="font-weight:700;color:#6bcb77"
              >{formatCurrency(editingOrder.total)}</span
            >
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
  /* ── Admin Header Layout ────────────────────────────────────────────────── */
  .admin-header {
    margin-bottom: 32px;
    width: 100%;
  }

  .header-content {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .accent-color {
    color: #e07b30;
  }

  /* ── Segmented Control (Exact Match of Funding Style) ────────────────────── */
  .tabs-container {
    display: flex;
    justify-content: center; /* Center the tabs as requested */
    width: 100%;
  }

  .segmented-control {
    display: flex;
    background: var(--surface-2);
    border-radius: 99px;
    padding: 4px;
    border: 1px solid var(--border);
    position: relative;
    gap: 0;
    width: 450px; /* Wider to accommodate 3 tabs */
  }

  .segment-highlight {
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: 4px;
    /* Overridden inline for the 3 tabs, but default is calc(100%/3) */
    background: var(--surface);
    border-radius: 99px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    z-index: 1;
  }

  .segment {
    position: relative;
    z-index: 2;
    flex: 1;
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

  /* ── Table & Layout Fixes ────────────────────────────────────────────────── */
  .table-wrap {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    border-radius: var(--radius-sm);
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.05);
    background: var(--surface);
    border: 1px solid var(--border);
  }

  .card {
    width: 100%;
    max-width: 100%;
    overflow: hidden;
  }

  .orders-card {
    max-width: 1100px;
    margin-left: auto;
    margin-right: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 1000px; /* Ensure columns have enough room to not clip */
    table-layout: auto;
  }

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

  /* ── Add Layout ───────────────────────────────────────────────────────────── */
  .lock-screen {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 85vh;
    padding: 20px;
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
    box-shadow:
      0 20px 60px rgba(0, 0, 0, 0.3),
      0 0 20px rgba(var(--primary-rgb), 0.1);
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 12px;
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
