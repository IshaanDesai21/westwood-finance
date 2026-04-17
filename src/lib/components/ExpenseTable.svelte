<script>
  import { formatCurrency, formatDate, truncate, capitalize, getTeamBadgeClass } from '../utils.js';

  /** @type {{ expenses?: any[], limit?: number, hideTeam?: boolean }} */
  let { expenses = [], limit = 0, hideTeam = false } = $props();

  let sortCol = $state("timestamp");
  let sortDir = $state("desc");

  function toggleSort(/** @type {string} */ col) {
    if (sortCol === col) {
      sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      sortCol = col;
      sortDir = col === "timestamp" || col === "total" || col === "price" ? "desc" : "asc";
    }
  }

  let sortedExpenses = $derived(
    expenses.slice().sort((a, b) => {
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

  let display = $derived(limit > 0 ? sortedExpenses.slice(0, limit) : sortedExpenses);
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
        {#if !hideTeam}
          <th class="sortable" onclick={() => toggleSort("team")}>
            <div class="th-content">
              Team {sortCol === "team" ? (sortDir === "asc" ? "↑" : "↓") : ""}
            </div>
          </th>
        {/if}
        <th class="sortable" onclick={() => toggleSort("timestamp")}>
          <div class="th-content">
            Date {sortCol === "timestamp" ? (sortDir === "asc" ? "↑" : "↓") : ""}
          </div>
        </th>
        <th class="text-right sortable" onclick={() => toggleSort("price")}>
          <div class="th-content text-right">
            Price {sortCol === "price" ? (sortDir === "asc" ? "↑" : "↓") : ""}
          </div>
        </th>
        <th class="text-right sortable" onclick={() => toggleSort("quantity")}>
          <div class="th-content text-right">
            Qty {sortCol === "quantity" ? (sortDir === "asc" ? "↑" : "↓") : ""}
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
      {#each display as expense (expense.id)}
        <tr>
          <td>
            <div class="item-name">
              {#if expense.link}
                <a href={expense.link} target="_blank" rel="noopener" class="item-link">
                  {truncate(expense.item, 40)}
                </a>
              {:else}
                <span class="item-text">{truncate(expense.item, 40)}</span>
              {/if}
            </div>
            {#if expense.notes}
              <div class="item-notes">{truncate(expense.notes, 50)}</div>
            {/if}
          </td>
          <td><span class="company-name">{expense.company || '—'}</span></td>
          <td>
            <span class="badge badge-{expense.category}">
              {capitalize(expense.category)}
            </span>
          </td>
          {#if !hideTeam}
            <td class="text-muted font-medium">{expense.team || expense.user || '—'}</td>
          {/if}
          <td class="text-dim monospace" style="color: var(--text-dim);">{formatDate(expense.timestamp)}</td>
          <td class="text-right monospace">{formatCurrency(expense.price)}</td>
          <td class="text-right font-medium">{expense.quantity}</td>
          <td class="text-right monospace amount">
            {formatCurrency(expense.total)}
          </td>
        </tr>
      {/each}
      {#if expenses.length === 0}
        <tr>
          <td colspan="8">
            <div class="empty-state" style="padding: 40px 0;">
              <div class="icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M8 11h8"/><path d="M8 16h8"/><path d="M8 6h8"/></svg>
              </div>
              No expenses found
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
</style>
