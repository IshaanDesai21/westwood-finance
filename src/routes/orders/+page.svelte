<script>
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import FilterBar from "$lib/components/FilterBar.svelte";
  import OrderTable from "$lib/components/OrderTable.svelte";
  import LoadingIndicator from "$lib/components/LoadingIndicator.svelte";
  import { dataService } from "$lib/dataService.svelte.js";

  /** @typedef {import('$lib/dataService.svelte.js').Order} Order */

  /** @type {{ orders: Order[], loading: boolean, error: string|null }} */
  let { orders, loading, error } = $derived(dataService);
  let syncing = $state(false);

  let filters = $state({
    search: "",
    category: "",
    company: "",
    team: "",
    status: "",
    dateFrom: "",
    dateTo: "",
  });

  async function sync() {
    syncing = true;
    await dataService.load(true);
    syncing = false;
  }

  onMount(() => {
    dataService.load();
    if (browser) {
      const q = new URLSearchParams(window.location.search);
      if (q.has("search")) filters.search = q.get("search") || "";
      if (q.has("category")) filters.category = q.get("category") || "";
      if (q.has("company")) filters.company = q.get("company") || "";
      if (q.has("team")) filters.team = q.get("team") || "";
      if (q.has("status")) filters.status = q.get("status") || "";
    }
  });

  $effect(() => {
    if (browser) {
      const url = new URL(window.location.href);
      Object.entries(filters).forEach(([k, v]) => {
        if (v && v !== "All Categories" && v !== "All Statuses" && v !== "All Teams") {
          url.searchParams.set(k, v);
        } else {
          url.searchParams.delete(k);
        }
      });
      window.history.replaceState(null, "", url.toString());
    }
  });

  /**
   * @param {Order} exp
   * @param {string} s
   */
  function matchSearch(exp, s) {
    if (!s) return true;
    s = s.toLowerCase();
    return (
      (exp.item || "").toLowerCase().includes(s) ||
      (exp.notes || "").toLowerCase().includes(s) ||
      (exp.company || "").toLowerCase().includes(s)
    );
  }

  function exportCSV() {
    if (!filtered || !filtered.length) return;
    const headers = ["Item", "Company", "Price", "Quantity", "Total", "Category", "Team", "Status", "Date", "UUID", "Tracking/Link", "Notes"];
    
    const csvRows = [];
    csvRows.push(headers.join(','));
    for (const row of filtered) {
      const values = [
         row.item, row.company, row.price, row.quantity, row.total, row.category, 
         row.team, row.status, (row.timestamp || "").slice(0, 10), row.orderUUID, (row.tracking || row.link || ""), row.notes
      ].map(val => {
        let str = String(val || '').replace(/"/g, '""');
        return `"${str}"`;
      });
      csvRows.push(values.join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `westwood_orders_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  let filtered = $derived(
    orders
      .filter((/** @type {Order} */ e) => {
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
        if (
          filters.status &&
          e.status !== filters.status &&
          filters.status !== "All Statuses"
        )
          return false;
        if (!matchSearch(e, filters.search)) return false;
        return true;
      })
      .sort((/** @type {Order} */ a, /** @type {Order} */ b) => {
        // Define priority for statuses: "Submitted and in review" gets priority 0
        /** @type {Record<string, number>} */
        const STATUS_PRIORITY = {
          "Pending Review": 0,
          Approved: 1,
          Ordered: 2,
          Received: 3,
          Denied: 4,
          Cancelled: 5,
        };

        const priorityA = STATUS_PRIORITY[a.status] ?? 99;
        const priorityB = STATUS_PRIORITY[b.status] ?? 99;

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        // Secondary sort: Newest first
        return (
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      }),
  );
</script>

<svelte:head>
  <title>Orders Dashboard — Westwood Finance</title>
</svelte:head>

<div class="page-header">
  <h1>Orders <span>Dashboard</span></h1>
  <div style="display:flex;gap:10px;align-items:center">
    {#if error}
      <span class="error-text" style="font-size:0.85rem">⚠ {error}</span>
    {/if}
    <button class="btn btn-ghost btn-sm" onclick={sync} disabled={syncing}>
      <span class:spinning={syncing}>↻</span>
      {syncing ? "Syncing…" : "Refresh"}
    </button>
    <button class="btn btn-ghost btn-sm" onclick={exportCSV} disabled={!filtered || !filtered.length}>
      ↓ Export CSV
    </button>
    <a href="/add" class="btn btn-primary btn-sm">+ New Request</a>
  </div>
</div>

<FilterBar bind:filters />

{#if loading && !orders.length}
  <LoadingIndicator text="Syncing with Google Sheets…" />
{:else if orders.length > 0}
  <div class={!dataService.hasLoadedOnce ? "fade-in" : ""}>
    <OrderTable orders={filtered} />
  </div>
{:else}
  <div class="empty-state card">
    <div class="icon">📦</div>
    <h3>No orders found</h3>
    <p>Submit a new order request to see it appear here.</p>
  </div>
{/if}

<style>
  .error-text {
    color: #f16a4e;
    font-weight: 500;
  }
</style>
