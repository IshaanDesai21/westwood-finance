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

<div class="table-wrap fade-in">
  <table>
    <thead>
      <tr>
        <th class="sortable" onclick={() => toggleSort("item")}>
          <div class="th-content">
            Item {sortCol === "item" ? (sortDir === "asc" ? "↑" : "↓") : ""}
          </div>
        </th>
        <th class="sortable" onclick={() => toggleSort("company")}>
          <div class="th-content">
            Company {sortCol === "company" ? (sortDir === "asc" ? "↑" : "↓") : ""}
          </div>
        </th>
        <th class="sortable" onclick={() => toggleSort("category")}>
          <div class="th-content">
            Category {sortCol === "category" ? (sortDir === "asc" ? "↑" : "↓") : ""}
          </div>
        </th>
        {#if !hideTeamColumn}
          <th class="sortable" onclick={() => toggleSort("team")}>
            <div class="th-content">
              Team {sortCol === "team" ? (sortDir === "asc" ? "↑" : "↓") : ""}
            </div>
          </th>
        {/if}
        <th class="sortable" onclick={() => toggleSort("status")}>
          <div class="th-content">
            Status {sortCol === "status" ? (sortDir === "asc" ? "↑" : "↓") : ""}
          </div>
        </th>
        <th class="sortable" onclick={() => toggleSort("timestamp")}>
          <div class="th-content">
            Date {sortCol === "timestamp" ? (sortDir === "asc" ? "↑" : "↓") : ""}
          </div>
        </th>
        <th class="text-right sortable" onclick={() => toggleSort("total")}>
          <div class="th-content text-right">
            Total {sortCol === "total" ? (sortDir === "asc" ? "↑" : "↓") : ""}
          </div>
        </th>
      </tr>
    </thead>
    <tbody>
      {#each display as order (order.id)}
        {@const orderColor = getOrderColor(order.orderUUID)}
        <tr class="group-row" style="--group-color: {orderColor}">
          <td>
            <div class="item-name">
              {#if order.link}
                <a href={order.link} target="_blank" rel="noopener" class="item-link">
                  {truncate(order.item, 40)}
                </a>
              {:else}
                <span class="item-text">{truncate(order.item, 40)}</span>
              {/if}
            </div>
            {#if order.notes}
              <div class="item-notes">{truncate(order.notes, 50)}</div>
            {/if}
          </td>
          <td><span class="company-name">{order.company || '—'}</span></td>
          <td>
            <span class="badge badge-{order.category}">
              {capitalize(order.category)}
            </span>
          </td>
          {#if !hideTeamColumn}
            <td class="text-muted font-medium">
              {order.team || order.user || '—'}
            </td>
          {/if}
          <td>
            <OrderStatusBadge status={order.status} />
          </td>
          <td class="text-dim monospace" style="color: var(--text-dim);">{formatFullDate(order.timestamp)}</td>
          <td class="text-right monospace amount">
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
  .table-wrap {
    box-shadow: var(--shadow-sm);
    margin-bottom: 2rem;
  }
  
  table { 
    min-width: 900px;
  }
  
  .th-content {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 100%;
  }

  .item-name { 
    font-weight: 600; 
    color: var(--text);
  }
  
  .item-link {
    color: var(--primary);
    transition: color 0.2s;
  }
  
  .item-link:hover {
    color: var(--primary-dark);
    text-decoration: underline;
  }

  .item-notes { 
    font-size: 0.72rem; 
    color: var(--text-muted); 
    margin-top: 1px;
    font-weight: 400;
  }
  
  .company-name {
    font-size: 0.82rem;
    color: var(--text-muted);
  }
  
  .amount {
    font-weight: 700;
    color: #fff;
    font-size: 0.95rem;
  }
  
  .text-dim { color: var(--text-dim); }
  .font-medium { font-weight: 500; }

  /* Group Indicator Line */
  .group-row td:first-child {
    position: relative;
    padding-left: 20px !important;
  }

  .group-row td:first-child::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: var(--group-color, var(--primary));
    opacity: 0.9;
  }
</style>
