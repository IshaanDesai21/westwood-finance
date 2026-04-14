<script>
  import { onMount } from "svelte";
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
    status: "Submitted and in review",
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
        if (filters.status && e.status !== filters.status && filters.status !== "All Statuses")
          return false;
        if (!matchSearch(e, filters.search)) return false;
        return true;
      })
      .sort((/** @type {Order} */ a, /** @type {Order} */ b) => {
        // Define priority for statuses: "Submitted and in review" gets priority 0
        /** @type {Record<string, number>} */
        const STATUS_PRIORITY = {
          "Submitted and in review": 0,
          "Approved": 1,
          "Ordered": 2,
          "Received": 3,
          "Denied": 4,
          "Cancelled": 5
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
      {syncing ? "Syncing…" : "Refresh List"}
    </button>
    <a href="/add" class="btn btn-primary btn-sm">+ New Request</a>
  </div>
</div>

<FilterBar bind:filters />

{#if loading && !orders.length}
  <LoadingIndicator text="Syncing with Google Sheets…" />
{:else if orders.length > 0}
  <div class="fade-in">
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
