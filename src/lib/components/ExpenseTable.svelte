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
          <th class="sortable" onclick={() => toggleSort("user")}>
            <div class="th-content">
              User {sortCol === "user" ? (sortDir === "asc" ? "↑" : "↓") : ""}
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
            <td class="text-muted font-medium">{expense.user || '—'}</td>
          {/if}
          <td class="text-dim monospace">{formatDate(expense.timestamp)}</td>
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
            <div class="empty-state">
              <div class="icon">📋</div>
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
