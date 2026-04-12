<script>
  import { onMount } from 'svelte';
  import ExpenseTable from '$lib/components/ExpenseTable.svelte';
  import FilterBar from '$lib/components/FilterBar.svelte';
  import { orders, loading, error, loadOrders } from '$lib/stores/orders.js';
  import { formatCurrency } from '$lib/utils.js';

  let filters = $state({ search: '', category: '', company: '', user: '', dateFrom: '', dateTo: '' });
  let syncing = $state(false);

  onMount(() => loadOrders());

  function applyFilters(/** @type {any} */ updated) {
    filters = { .../** @type {any} */ (updated) };
  }

  function matchSearch(/** @type {any} */ exp, /** @type {string} */ q) {
    if (!q) return true;
    const s = q.toLowerCase();
    return (exp.item || '').toLowerCase().includes(s) ||
           (exp.notes || '').toLowerCase().includes(s) ||
           (exp.company || '').toLowerCase().includes(s);
  }

  let filtered = $derived($orders.filter(e => {
    if (filters.category && e.category !== filters.category) return false;
    if (filters.company && !e.company?.toLowerCase().includes(filters.company.toLowerCase())) return false;
    if (filters.user && !e.user?.toLowerCase().includes(filters.user.toLowerCase())) return false;
    if (filters.dateFrom && e.timestamp < filters.dateFrom) return false;
    if (filters.dateTo && e.timestamp?.slice(0,10) > filters.dateTo) return false;
    if (!matchSearch(e, filters.search)) return false;
    return true;
  }));

  let filteredTotal = $derived(filtered.reduce((s, e) => s + (e.total || 0), 0));

  async function sync() {
    syncing = true;
    await loadOrders(true);
    syncing = false;
  }

  // ── Export helpers ──────────────────────────────────────────────────────────
  function exportCsv() {
    const headers = ['Item','Company','Link','Price','Quantity','Notes','Category','User','Timestamp','Total'];
    const rows = filtered.map(e => [
      e.item, e.company, e.link, e.price, e.quantity, e.notes,
      e.category, e.user, e.timestamp, e.total,
    ].map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    download(csv, 'westwood-part-orders.csv', 'text/csv');
  }

  function exportPdf() {
    const rows = filtered.map(e =>
      `<tr>
        <td>${e.item}</td><td>${e.company}</td><td>${e.category}</td>
        <td>${e.user}</td><td>${e.timestamp?.slice(0,10)}</td>
        <td style="text-align:right">$${e.price?.toFixed(2)}</td>
        <td style="text-align:right">${e.quantity}</td>
        <td style="text-align:right"><strong>$${e.total?.toFixed(2)}</strong></td>
      </tr>`
    ).join('');
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Westwood Finance — Part Orders</title>
<style>
  body{font-family:system-ui,sans-serif;padding:24px;color:#111}
  h1{font-size:1.4rem;margin-bottom:4px}
  p{color:#666;margin-bottom:16px;font-size:0.9rem}
  table{width:100%;border-collapse:collapse;font-size:0.85rem}
  th{text-align:left;border-bottom:2px solid #aaa;padding:6px 8px;background:#f5f5f5}
  td{padding:6px 8px;border-bottom:1px solid #e5e5e5}
  tfoot td{font-weight:700;border-top:2px solid #aaa;border-bottom:none}
  @media print{button{display:none}}
</style></head><body>
<button onclick="window.print()" style="float:right;padding:6px 14px;cursor:pointer">Print / Save PDF</button>
<h1>Westwood Robotics — Part Orders Report</h1>
<p>Generated ${new Date().toLocaleString()} · ${filtered.length} items · Total: $${filteredTotal.toFixed(2)}</p>
<table>
<thead><tr><th>Item</th><th>Company</th><th>Category</th><th>User</th><th>Date</th><th>Price</th><th>Qty</th><th>Total</th></tr></thead>
<tbody>${rows}</tbody>
<tfoot><tr><td colspan="7">Grand Total</td><td style="text-align:right">$${filteredTotal.toFixed(2)}</td></tr></tfoot>
</table></body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  }

  function download(/** @type {string} */ content, /** @type {string} */ filename, /** @type {string} */ type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
</script>

<svelte:head>
  <title>Part Orders — Westwood Finance</title>
</svelte:head>

<div class="page-header">
  <h1>Part <span>Orders</span></h1>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button class="btn btn-ghost btn-sm" id="export-csv-btn" onclick={exportCsv}>↓ CSV</button>
    <button class="btn btn-ghost btn-sm" id="export-pdf-btn" onclick={exportPdf}>↓ PDF</button>
    <button class="btn btn-ghost btn-sm" onclick={sync} disabled={syncing}>
      <span class:spinning={syncing}>↻</span> {syncing ? 'Syncing…' : 'Sync'}
    </button>
    <a href="https://docs.google.com/spreadsheets" target="_blank" class="btn btn-primary btn-sm">Open Sheet</a>
  </div>
</div>

{#if $error}
  <div class="error-bar">⚠ {$error}</div>
{/if}

<FilterBar onchange={applyFilters} />

<div class="card" style="padding:0;overflow:hidden">
  {#if $loading}
    <div class="empty-state"><span class="spinning">↻</span> Loading…</div>
  {:else}
    <ExpenseTable expenses={filtered} />
  {/if}
</div>

<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;font-size:0.85rem">
  <span class="text-muted">{filtered.length} of {$orders.length} orders</span>
  <span>Filtered total: <strong>{formatCurrency(filteredTotal)}</strong></span>
</div>
