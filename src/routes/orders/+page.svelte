<script>
  import { onMount } from "svelte";
  import OrderStatusBadge from "$lib/components/OrderStatusBadge.svelte";
  import FilterBar from "$lib/components/FilterBar.svelte";
  import LoadingIndicator from "$lib/components/LoadingIndicator.svelte";
  import { fetchOrders } from "./fetchOrders.ts";
  // @ts-ignore
  import { formatCurrency, getTeamBadgeClass } from "$lib/utils.js";

  let orders = $state(/** @type {any[]} */ ([]));
  let loading = $state(false);
  let error = $state(/** @type {string | null} */ (null));

  let filters = $state({
    search: "",
    category: "",
    company: "",
    team: "",
    status: "",
    dateFrom: "",
    dateTo: "",
  });
  let syncing = $state(false);

  let sortCol = $state("status");
  let sortDir = $state("asc");

  function toggleSort(/** @type {string} */ col) {
    if (sortCol === col) {
      sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      sortCol = col;
      sortDir = col === "timestamp" || col === "total" || col === "price" ? "desc" : "asc";
    }
  }

  // Generate a stable color from a UUID
  function getOrderColor(/** @type {any} */ uuid) {
    if (!uuid) return 'transparent';
    let hash = 0;
    for (let i = 0; i < uuid.length; i++) {
      hash = uuid.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 65%, 45%)`; // Middle saturation/lightness for readability on dark bg
  }

  async function loadOrders() {
    loading = true;
    error = null;
    try {
      orders = await fetchOrders();
    } catch (e) {
      error = /** @type {Error} */ (e).message;
    } finally {
      loading = false;
    }
  }

  onMount(() => loadOrders());

  function applyFilters(/** @type {any} */ updated) {
    filters = { .../** @type {any} */ (updated) };
  }

  function matchSearch(/** @type {any} */ exp, /** @type {string} */ q) {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      (exp.item || "").toLowerCase().includes(s) ||
      (exp.notes || "").toLowerCase().includes(s) ||
      (exp.company || "").toLowerCase().includes(s)
    );
  }

  let filtered = $derived(
    orders
      .filter((e) => {
        if (filters.category && e.category !== filters.category) return false;
        if (
          filters.company &&
          !e.company?.toLowerCase().includes(filters.company.toLowerCase())
        )
          return false;
        if (
          filters.team &&
          !e.team?.toLowerCase().includes(filters.team.toLowerCase())
        )
          return false;
        if (filters.dateFrom && e.timestamp < filters.dateFrom) return false;
        if (filters.dateTo && e.timestamp?.slice(0, 10) > filters.dateTo)
          return false;
        if (filters.status && e.status !== filters.status && filters.status !== "All Statuses")
          return false;
        if (!matchSearch(e, filters.search)) return false;
        return true;
      })
      .sort((a, b) => {
        // Define priority for statuses
        const STATUS_PRIORITY = {
          "Submitted and in review": 0,
          "Approved": 1,
          "Ordered": 2,
          "Received": 3,
          "Denied": 4,
          "Cancelled": 5
        };

        /** @param {string} s */
        const getPriority = (s) => (/** @type {Record<string, number>} */ (STATUS_PRIORITY))[s] ?? 99;

        // If we are sorting by status (the default), handle priority then date
        if (sortCol === "status") {
          const priorityA = getPriority(a.status);
          const priorityB = getPriority(b.status);
          
          if (priorityA !== priorityB) {
            return sortDir === "asc" ? priorityA - priorityB : priorityB - priorityA;
          }
          // If priorities are equal, fallback to timestamp descending (newest first)
          return (b.timestamp || "").localeCompare(a.timestamp || "");
        }

        // Otherwise handle standard manual sorting
        let valA = a[sortCol] || "";
        let valB = b[sortCol] || "";
        if (sortCol === 'timestamp' || sortCol === 'date') {
            valA = a.timestamp || "";
            valB = b.timestamp || "";
        } else if (sortCol === 'total' || sortCol === 'price' || sortCol === 'quantity') {
            valA = Number(valA) || 0;
            valB = Number(valB) || 0;
        }

        if (valA < valB) return sortDir === "asc" ? -1 : 1;
        if (valA > valB) return sortDir === "asc" ? 1 : -1;

        // Final fallback for all sorts: newest first
        return (b.timestamp || "").localeCompare(a.timestamp || "");
      }),
  );

  let filteredTotal = $derived(
    filtered.reduce((s, e) => s + (e.total || 0), 0),
  );

  async function sync() {
    syncing = true;
    await loadOrders();
    syncing = false;
  }

  // ── Export helpers ──────────────────────────────────────────────────────────
  function exportCsv() {
    const headers = [
      "Item",
      "Company",
      "Link",
      "Price",
      "Qty",
      "Notes",
      "Category",
      "Team",
      "Timestamp",
      "Total",
      "Status",
    ];
    const rows = filtered.map((e) =>
      [
        e.item,
        e.company,
        e.link,
        e.price,
        e.quantity,
        e.notes,
        e.category,
        e.team,
        e.timestamp,
        e.total,
        e.status,
      ]
        .map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    download(csv, "westwood-orders.csv", "text/csv");
  }

  function exportPdf() {
    const rows = filtered
      .map(
        (e) =>
          `<tr>
        <td>${e.item}</td><td>${e.company}</td><td>${e.category}</td>
        <td>${e.team}</td><td>${e.timestamp?.slice(0, 10)}</td>
        <td style="text-align:right">$${e.price?.toFixed(2)}</td>
        <td style="text-align:right">${e.quantity}</td>
        <td style="text-align:right"><strong>$${e.total?.toFixed(2)}</strong></td>
        <td>${e.status || "—"}</td>
      </tr>`,
      )
      .join("");
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Westwood Finance — Orders</title>
<style>
  body{font-family:system-ui,sans-serif;padding:24px;color:#111}
  table{width:100%;border-collapse:collapse;font-size:0.85rem}
  th{text-align:left;border-bottom:2px solid #aaa;padding:6px 8px;background:#f5f5f5}
  td{padding:6px 8px;border-bottom:1px solid #e5e5e5}
  tfoot td{font-weight:700;border-top:2px solid #aaa}
  @media print{button{display:none}}
</style></head><body>
<button onclick="window.print()" style="float:right;padding:6px 14px;cursor:pointer">Print / Save PDF</button>
<h1>Westwood Robotics — Orders Report</h1>
<p>Generated ${new Date().toLocaleString()} · ${filtered.length} items · Total: $${filteredTotal.toFixed(2)}</p>
<table>
<thead><tr><th>Item</th><th>Company</th><th>Category</th><th>User</th><th>Date</th><th>Price</th><th>Qty</th><th>Total</th><th>Status</th></tr></thead>
<tbody>${rows}</tbody>
<tfoot><tr><td colspan="7">Grand Total</td><td style="text-align:right">$${filteredTotal.toFixed(2)}</td><td></td></tr></tfoot>
</table></body></html>`;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  }

  function download(
    /** @type {string} */ content,
    /** @type {string} */ filename,
    /** @type {string} */ type,
  ) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
</script>

<svelte:head>
  <title>Orders — Westwood Finance</title>
</svelte:head>

<div class="page-header">
  <h1>Orders</h1>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button class="btn btn-ghost btn-sm" id="export-csv-btn" onclick={exportCsv}
      >↓ CSV</button
    >
    <button class="btn btn-ghost btn-sm" id="export-pdf-btn" onclick={exportPdf}
      >↓ PDF</button
    >
    <button class="btn btn-ghost btn-sm" onclick={sync} disabled={syncing}>
      <span class:spinning={syncing}>↻</span>
      {syncing ? "Syncing…" : "Sync"}
    </button>
    <a href="/admin" class="btn btn-ghost btn-sm">🔐 Manage Status</a>
    <a
      href="https://docs.google.com/spreadsheets/d/1NpbvcOCyG7NZxLWVYu3aqHqw57Zwh3DxD7_UpGxHcVE/view?gid=0#gid=0"
      target="_blank"
      class="btn btn-primary btn-sm">Open Sheet</a
    >
  </div>
</div>

{#if error}
  <div class="error-bar">⚠ {error}</div>
{/if}

<FilterBar onchange={applyFilters} />

<div class="card" style="padding:0;overflow:hidden">
  {#if loading}
    <LoadingIndicator text="Loading orders" />
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="sortable" onclick={() => toggleSort("item")}>Item {sortCol === "item" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
            <th class="sortable" onclick={() => toggleSort("company")}>Company {sortCol === "company" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
            <th class="sortable" onclick={() => toggleSort("category")}>Category {sortCol === "category" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
            <th class="sortable" onclick={() => toggleSort("team")}>Team {sortCol === "team" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
            <th class="sortable" onclick={() => toggleSort("timestamp")}>Date {sortCol === "timestamp" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
            <th class="sortable text-right" onclick={() => toggleSort("price")}>Price {sortCol === "price" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
            <th class="sortable text-right" onclick={() => toggleSort("quantity")}>Qty {sortCol === "quantity" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
            <th class="sortable text-right" onclick={() => toggleSort("total")}>Total {sortCol === "total" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
            <th class="sortable" onclick={() => toggleSort("status")}>Status {sortCol === "status" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
            <th class="sortable text-right" onclick={() => toggleSort("orderUUID")}>Order ID {sortCol === "orderUUID" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
          </tr>
        </thead>
        <tbody>
          {#each filtered as order (order.id)}
            {@const orderColor = getOrderColor(order.orderUUID)}
            <tr class="fade-in" style="border-left: 4px solid {orderColor}">
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
                {#if order.notes}<div
                    style="font-size:0.78rem;color:var(--text-muted)"
                  >
                    {order.notes}
                  </div>{/if}
              </td>
              <td>{order.company || "—"}</td>
              <td>
                <span class="badge badge-{order.category}"
                  >{order.category}</span
                >
              </td>
              <td>
                {#if order.team}
                  <span class="badge {getTeamBadgeClass(order.team)}">{order.team}</span>
                {:else}
                  —
                {/if}
              </td>
              <td class="text-muted">{order.timestamp?.slice(0, 10) || "—"}</td>
              <td class="text-right monospace">{formatCurrency(order.price)}</td
              >
              <td class="text-right">{order.quantity}</td>
              <td class="text-right monospace" style="font-weight:600"
                >{formatCurrency(order.total)}</td
              >
              <td
                ><OrderStatusBadge
                  status={order.status || "Submitted and in review"}
                /></td
              >
              <td class="text-right monospace">{order.orderUUID || "—"}</td>
            </tr>
          {/each}
          {#if filtered.length === 0}
            <tr
              ><td colspan="9">
                <div class="empty-state">
                  <div class="icon">📦</div>
                  No orders found
                </div>
              </td></tr
            >
          {/if}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<div
  style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;font-size:0.85rem"
>
  <span class="text-muted">{filtered.length} of {orders.length} orders</span>
  <span>Filtered total: <strong>{formatCurrency(filteredTotal)}</strong></span>
</div>
