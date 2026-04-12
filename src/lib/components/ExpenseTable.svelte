<script>
  import { formatCurrency, formatDate, truncate, capitalize } from '../utils.js';

  let { expenses = [], limit = 0 } = $props();

  let display = $derived(limit > 0 ? expenses.slice(0, limit) : expenses);
</script>

<div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Company</th>
        <th>Category</th>
        <th>User</th>
        <th>Date</th>
        <th class="text-right">Price</th>
        <th class="text-right">Qty</th>
        <th class="text-right">Total</th>
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
          <td>{expense.user || '—'}</td>
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
