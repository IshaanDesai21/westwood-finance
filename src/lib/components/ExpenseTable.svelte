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

  /** @type {Record<string, string>} */
  const CAT_COLORS = {
    hardware: '#f97316',
    software: '#3b82f6',
    outreach: '#10b981',
    food: '#eab308',
    miscellaneous: '#8b5cf6',
  };

  /** @type {Record<string, string>} */
  const CAT_ICONS = {
    hardware: '⚙',
    software: '💻',
    outreach: '📣',
    food: '🍕',
    miscellaneous: '📦',
  };

  function getCatColor(/** @type {string|undefined} */ cat) {
    return CAT_COLORS[(cat || 'miscellaneous').toLowerCase()] || '#8b5cf6';
  }
  function getCatIcon(/** @type {string|undefined} */ cat) {
    return CAT_ICONS[(cat || 'miscellaneous').toLowerCase()] || '📦';
  }
</script>

<!-- ── Desktop Table ─────────────────────────────────────────────────────── -->
<div class="table-wrap fade-in desktop-table">
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
    {#if display.length > 0}
      <tfoot>
        <tr class="total-row">
          <td colspan={hideTeam ? 7 : 8} class="total-label">Subtotal</td>
          <td class="text-right monospace total-amount">
            {formatCurrency(display.reduce((sum, e) => sum + (e.total || 0), 0))}
          </td>
        </tr>
      </tfoot>
    {/if}
  </table>
</div>

<!-- ── iOS Mobile List ───────────────────────────────────────────────────── -->
<div class="ios-list-wrap fade-in mobile-list">
  {#if expenses.length === 0}
    <div class="empty-state" style="padding: 40px 16px; border-radius: 14px;">
      <div class="icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>
      </div>
      No expenses found
    </div>
  {:else}
    <div class="ios-list-group">
      {#each display as expense (expense.id)}
        {@const catColor = getCatColor(expense.category)}
        {@const catIcon = getCatIcon(expense.category)}
        <div class="ios-cell">
          <div class="ios-cell-icon" style="background: {catColor}22; color: {catColor}; font-size: 18px;">
            {catIcon}
          </div>
          <div class="ios-cell-body">
            <div class="ios-cell-title">{truncate(expense.item, 28)}</div>
            <div class="ios-cell-subtitle">
              {expense.company || '—'}{!hideTeam && expense.team ? ` · ${expense.team}` : ''} · {formatDate(expense.timestamp)}
            </div>
          </div>
          <div class="ios-cell-trailing">
            <span class="ios-cell-amount">{formatCurrency(expense.total)}</span>
            <span class="ios-cell-qty">×{expense.quantity}</span>
          </div>
        </div>
      {/each}
    </div>

    {#if display.length > 0}
      <div class="ios-total-row">
        <span class="ios-total-label">Subtotal</span>
        <span class="ios-total-amount">{formatCurrency(display.reduce((sum, e) => sum + (e.total || 0), 0))}</span>
      </div>
    {/if}
  {/if}
</div>

<style>
  .desktop-table { display: block; }
  .mobile-list   { display: none; }

  @media (max-width: 768px) {
    .desktop-table { display: none; }
    .mobile-list   { display: block; }
  }

  .table-wrap { box-shadow: var(--shadow-sm); }

  .th-content {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 100%;
  }

  .item-name { font-weight: 600; color: var(--text); }
  .item-link { color: var(--primary); transition: color 0.2s; }
  
  @media (hover: hover) {
    .item-link:hover { color: var(--primary-dark); text-decoration: underline; }
  }

  .item-notes { font-size: 0.72rem; color: var(--text-muted); margin-top: 1px; font-weight: 400; }
  .company-name { font-size: 0.82rem; color: var(--text-muted); }
  .amount { font-weight: 700; color: #fff; font-size: 0.95rem; }
  .text-dim { color: var(--text-dim); }
  .font-medium { font-weight: 500; }

  /* iOS list extras */
  .ios-list-wrap { margin-bottom: 1.5rem; }

  .ios-total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    margin-top: 8px;
  }

  .ios-total-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-family: -apple-system, 'SF Pro Text', sans-serif;
  }

  .ios-total-amount {
    font-size: 17px;
    font-weight: 700;
    color: #fff;
    font-family: 'SF Mono', 'JetBrains Mono', monospace;
    font-variant-numeric: tabular-nums;
  }

  .ios-cell-qty {
    font-size: 12px;
    color: var(--text-muted);
    font-family: -apple-system, 'SF Pro Text', sans-serif;
  }
</style>
