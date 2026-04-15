<script>
  import { formatCurrency, formatFullDate, truncate, capitalize, getTeamBadgeClass } from '../utils.js';
  import OrderStatusBadge from './OrderStatusBadge.svelte';

  /** @type {{ orders: any[], limit?: number, hideTeamColumn?: boolean }} */
  let { orders = [], limit = 0, hideTeamColumn = false } = $props();

  let sortCol = $state("status");
  let sortDir = $state("asc");

  function toggleSort(/** @type {string} */ col) {
    if (sortCol === col) {
      sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      sortCol = col;
      sortDir = (col === "timestamp" || col === "total" || col === "price") ? "desc" : "asc";
    }
  }

  /** @type {Record<string, number>} */
  const STATUS_PRIORITY = {
    "pending review": 0,
    "approved": 1,
    "ordered": 2,
    "received": 3,
    "denied": 4,
    "cancelled": 5,
  };

  let sortedOrders = $derived(
    orders.slice().sort((a, b) => {
      if (sortCol === 'status') {
        let pA = STATUS_PRIORITY[(a.status || "").toLowerCase().trim()] ?? 99;
        let pB = STATUS_PRIORITY[(b.status || "").toLowerCase().trim()] ?? 99;
        if (pA !== pB) return sortDir === "asc" ? pA - pB : pB - pA;
        // Secondary sort: timestamp newest first
        let tA = new Date(a.timestamp || 0).getTime();
        let tB = new Date(b.timestamp || 0).getTime();
        return tB - tA;
      }

      let valA = a[sortCol] || "";
      let valB = b[sortCol] || "";
      
      if (sortCol === 'total' || sortCol === 'price' || sortCol === 'quantity') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      }

      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    })
  );

  let display = $derived(limit > 0 ? sortedOrders.slice(0, limit) : sortedOrders);
  
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

<div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th class="sortable" onclick={() => toggleSort("item")}>Item {sortCol === "item" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
        <th class="sortable" onclick={() => toggleSort("company")}>Company {sortCol === "company" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
        <th class="sortable" onclick={() => toggleSort("category")}>Category {sortCol === "category" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
        {#if !hideTeamColumn}
          <th class="sortable" onclick={() => toggleSort("team")}>Team {sortCol === "team" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
        {/if}
        <th class="sortable" onclick={() => toggleSort("status")}>Status {sortCol === "status" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
        <th class="sortable" onclick={() => toggleSort("timestamp")}>Date {sortCol === "timestamp" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
        <th class="text-right sortable" onclick={() => toggleSort("total")}>Total {sortCol === "total" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
      </tr>
    </thead>
    <tbody>
      {#each display as order (order.id)}
        {@const orderColor = getOrderColor(order.orderUUID)}
        <tr class="fade-in group-row" style="--group-color: {orderColor}">
          <td>
            <div class="item-name">
              {#if order.link}
                <a href={order.link} target="_blank" rel="noopener" title={order.item}>
                  {truncate(order.item, 36)}
                </a>
              {:else}
                {truncate(order.item, 36)}
              {/if}
            </div>
            {#if order.notes}
              <div class="item-notes">{truncate(order.notes, 50)}</div>
            {/if}
          </td>
          <td class="text-muted">{order.company || '—'}</td>
          <td>
            <span class="badge badge-{order.category}">
              {capitalize(order.category)}
            </span>
          </td>
          {#if !hideTeamColumn}
            <td>
              {#if order.team}
                <span>{order.team}</span>
              {:else if order.user}
                <span>{order.user}</span>
              {:else}
                —
              {/if}
            </td>
          {/if}
          <td>
            <OrderStatusBadge status={order.status} />
          </td>
          <td class="text-muted">{formatFullDate(order.timestamp)}</td>
          <td class="text-right monospace" style="font-weight:600">
            {formatCurrency(order.total)}
          </td>
        </tr>
      {/each}
      {#if orders.length === 0}
        <tr>
          <td colspan={hideTeamColumn ? 6 : 7}>
            <div class="empty-state">
              <div class="icon">📦</div>
              No orders found
            </div>
          </td>
        </tr>
      {/if}
    </tbody>
  </table>
</div>

<style>
  .item-name { font-weight: 500; }
  .item-notes { font-size: 0.78rem; color: var(--text-muted); margin-top: 2px; }
  a { color: var(--primary); }
  a:hover { text-decoration: underline; }
  .table-wrap { 
    overflow-x: auto; 
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    box-shadow: inset 0 0 10px rgba(0,0,0,0.05);
  }
  
  /* Optimize widths to prevent clipping */
  table { width: 100%; border-collapse: collapse; min-width: 900px; table-layout: auto; }
  th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border); }
  
  td { 
    padding: 12px 16px !important; 
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
