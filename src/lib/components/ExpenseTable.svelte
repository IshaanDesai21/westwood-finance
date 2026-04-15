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

<div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th class="sortable" onclick={() => toggleSort("item")}>Item {sortCol === "item" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
        <th class="sortable" onclick={() => toggleSort("company")}>Company {sortCol === "company" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
        <th class="sortable" onclick={() => toggleSort("category")}>Category {sortCol === "category" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
        {#if !hideTeam}
          <th class="sortable" onclick={() => toggleSort("user")}>User {sortCol === "user" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
        {/if}
        <th class="sortable" onclick={() => toggleSort("timestamp")}>Date {sortCol === "timestamp" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
        <th class="text-right sortable" onclick={() => toggleSort("price")}>Price {sortCol === "price" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
        <th class="text-right sortable" onclick={() => toggleSort("quantity")}>Qty {sortCol === "quantity" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
        <th class="text-right sortable" onclick={() => toggleSort("total")}>Total {sortCol === "total" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
      </tr>
    </thead>
    <tbody>
      {#each display as expense (expense.id)}
        <tr class="fade-in">
          <td>
            <div class="item-name">
              {#if expense.link}
                <a href={expense.link} target="_blank" rel="noopener" title={expense.item}>
                  {truncate(expense.item, 36)}
                </a>
              {:else}
                {truncate(expense.item, 36)}
              {/if}
            </div>
            {#if expense.notes}
              <div class="item-notes">{truncate(expense.notes, 50)}</div>
            {/if}
          </td>
          <td>{expense.company || '—'}</td>
          <td>
            <span class="badge badge-{expense.category}">
              {capitalize(expense.category)}
            </span>
          </td>
          {#if !hideTeam}
            <td>
              {#if expense.user}
                <span class="badge {getTeamBadgeClass(expense.user)}">{expense.user}</span>
              {:else}
                —
              {/if}
            </td>
          {/if}
          <td class="text-muted">{formatDate(expense.timestamp)}</td>
          <td class="text-right monospace">{formatCurrency(expense.price)}</td>
          <td class="text-right">{expense.quantity}</td>
          <td class="text-right monospace" style="font-weight:600">
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
  .item-name { font-weight: 500; }
  .item-notes { font-size: 0.78rem; color: var(--text-muted); margin-top: 2px; }
  a { color: var(--primary); }
  a:hover { text-decoration: underline; }
</style>
