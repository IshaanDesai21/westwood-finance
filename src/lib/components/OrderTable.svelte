<script>
  import { formatCurrency, formatDate, truncate, capitalize, getTeamBadgeClass } from '../utils.js';
  import OrderStatusBadge from './OrderStatusBadge.svelte';

  /** @type {{ orders: any[], limit?: number }} */
  let { orders = [], limit = 0 } = $props();

  let sortCol = $state("timestamp");
  let sortDir = $state("desc");

  function toggleSort(/** @type {string} */ col) {
    if (sortCol === col) {
      sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      sortCol = col;
      sortDir = (col === "timestamp" || col === "total" || col === "price") ? "desc" : "asc";
    }
  }

  let sortedOrders = $derived(
    orders.slice().sort((a, b) => {
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
        <th class="sortable" onclick={() => toggleSort("team")}>Team {sortCol === "team" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
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
          <td>
            {#if order.team}
              <span class="badge {getTeamBadgeClass(order.team)}">{order.team}</span>
            {:else if order.user}
              <span class="badge {getTeamBadgeClass(order.user)}">{order.user}</span>
            {:else}
              —
            {/if}
          </td>
          <td>
            <OrderStatusBadge status={order.status} />
          </td>
          <td class="text-muted">{formatDate(order.timestamp)}</td>
          <td class="text-right monospace" style="font-weight:600">
            {formatCurrency(order.total)}
          </td>
        </tr>
      {/each}
      {#if orders.length === 0}
        <tr>
          <td colspan="7">
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
  .table-wrap { overflow-x: auto; }
  
  /* Optimize widths to prevent clipping */
  table { table-layout: fixed; min-width: 900px; }
  th:nth-child(1), td:nth-child(1) { width: 30%; } /* Item */
  th:nth-child(2), td:nth-child(2) { width: 14%; } /* Company */
  th:nth-child(3), td:nth-child(3) { width: 12%; } /* Category */
  th:nth-child(4), td:nth-child(4) { width: 10%; } /* Team */
  th:nth-child(5), td:nth-child(5) { width: 14%; } /* Status */
  th:nth-child(6), td:nth-child(6) { width: 10%; } /* Date */
  th:nth-child(7), td:nth-child(7) { width: 10%; } /* Total */

  td { 
    padding: 10px 8px !important; 
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
