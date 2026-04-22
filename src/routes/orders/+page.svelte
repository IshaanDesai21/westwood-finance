<script>
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import FilterBar from "$lib/components/FilterBar.svelte";
  import OrderTable from "$lib/components/OrderTable.svelte";
  import LoadingIndicator from "$lib/components/LoadingIndicator.svelte";
  import { dataService } from "$lib/dataService.svelte.js";

  /** @typedef {import('$lib/dataService.svelte.js').Order} Order */

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
        if (
          v &&
          v !== "All Categories" &&
          v !== "All Statuses" &&
          v !== "All Teams"
        ) {
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
    const headers = [
      "Item",
      "Company",
      "Price",
      "Quantity",
      "Total",
      "Category",
      "Team",
      "Status",
      "Date",
      "UUID",
      "Tracking/Link",
      "Notes",
    ];

    const csvRows = [];
    csvRows.push(headers.join(","));
    for (const row of filtered) {
      const values = [
        row.item,
        row.company,
        row.price,
        row.quantity,
        row.total,
        row.category,
        row.team,
        row.status,
        (row.timestamp || "").slice(0, 10),
        row.orderUUID,
        row.tracking || row.link || "",
        row.notes,
      ].map((val) => {
        let str = String(val || "").replace(/"/g, '""');
        return `"${str}"`;
      });
      csvRows.push(values.join(","));
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute(
      "download",
      `westwood_orders_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  let filtered = $derived.by(() => {
    return dataService.orders
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
        /** @type {Record<string, number>} */
        const STATUS_PRIORITY = {
          "Pending Review": 0,
          Approved: 1,
          Ordered: 2,
          Received: 3,
          Denied: 4,
          Void: 5,
        };

        const priorityA = STATUS_PRIORITY[a.status] ?? 99;
        const priorityB = STATUS_PRIORITY[b.status] ?? 99;

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        return (
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      });
  });
</script>

<svelte:head>
  <title>Orders Dashboard | Westwood Finance</title>
</svelte:head>

<div class="page-header">
  <div class="header-left">
    <h1>Order <span>History</span></h1>
  </div>

  <div class="header-right">
    {#if dataService.error}
      <span class="error-text" style="display:inline-flex;align-items:center;">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          style="margin-right:6px;"
          ><path
            d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
          /><path d="M12 9v4" /><path d="M12 17h.01" /></svg
        >
        {dataService.error}
      </span>
    {/if}

    <div class="header-actions">
      <button class="btn btn-ghost btn-sm" onclick={sync} disabled={syncing}>
        <span class:spinning={syncing}>↻</span>
        {syncing ? "Syncing..." : "Refresh"}
      </button>

      <button
        class="btn btn-ghost btn-sm"
        onclick={exportCSV}
        disabled={!filtered || !filtered.length}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          ><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline
            points="7 10 12 15 17 10"
          /><line x1="12" y1="15" x2="12" y2="3" /></svg
        >
        Export
      </button>

      <a href="/add" class="btn btn-primary btn-sm">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          ><path d="M5 12h14" /><path d="M12 5v14" /></svg
        >
        New Request
      </a>
    </div>
  </div>
</div>

<FilterBar bind:filters />

{#if dataService.loading && !dataService.orders.length}
  <LoadingIndicator text="Syncing records..." />
{:else if dataService.orders.length > 0}
  <div class={!dataService.hasLoadedOnce ? "fade-in" : ""}>
    <OrderTable orders={filtered} />
  </div>
{:else}
  <div class="empty-state card fade-in">
    <div class="icon">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1"
        stroke-linecap="round"
        stroke-linejoin="round"
        ><path
          d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
        /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg
      >
    </div>
    <h3>No requests found</h3>
    <p>Submit a new order request to see it appear in the history.</p>
    <a href="/add" class="btn btn-primary btn-sm" style="margin-top: 16px;"
      >Create First Request</a
    >
  </div>
{/if}

<style>
  .header-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .header-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .error-text {
    color: var(--status-rejected);
    font-size: 0.8rem;
    font-weight: 600;
  }
</style>
