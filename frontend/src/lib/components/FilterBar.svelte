<script>
  import { CATEGORIES } from '../utils.js';

  let { onchange } = $props();

  let filters = $state({
    search: '',
    category: '',
    company: '',
    user: '',
    dateFrom: '',
    dateTo: '',
  });

  function emit() {
    onchange?.({ ...filters });
  }

  function reset() {
    filters.search = '';
    filters.category = '';
    filters.company = '';
    filters.user = '';
    filters.dateFrom = '';
    filters.dateTo = '';
    emit();
  }
</script>

<div class="filter-bar card">
  <div class="filter-row">
    <div class="form-group" style="flex:2; min-width:180px">
      <label for="filter-search">Search</label>
      <input
        id="filter-search"
        type="search"
        placeholder="Item name, notes…"
        bind:value={filters.search}
        oninput={emit}
      />
    </div>

    <div class="form-group">
      <label for="filter-category">Category</label>
      <select id="filter-category" bind:value={filters.category} onchange={emit}>
        <option value="">All Categories</option>
        {#each CATEGORIES as cat}
          <option value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
        {/each}
      </select>
    </div>

    <div class="form-group">
      <label for="filter-company">Company</label>
      <input
        id="filter-company"
        type="text"
        placeholder="Any company"
        bind:value={filters.company}
        oninput={emit}
      />
    </div>

    <div class="form-group">
      <label for="filter-user">User</label>
      <input
        id="filter-user"
        type="text"
        placeholder="Any user"
        bind:value={filters.user}
        oninput={emit}
      />
    </div>

    <div class="form-group">
      <label for="filter-from">From</label>
      <input id="filter-from" type="date" bind:value={filters.dateFrom} onchange={emit} />
    </div>

    <div class="form-group">
      <label for="filter-to">To</label>
      <input id="filter-to" type="date" bind:value={filters.dateTo} onchange={emit} />
    </div>

    <div class="form-group" style="justify-content:flex-end; padding-top:20px">
      <button class="btn btn-ghost btn-sm" onclick={reset}>Reset</button>
    </div>
  </div>
</div>

<style>
  .filter-bar { margin-bottom: 16px; padding: 16px; }
  .filter-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: flex-end;
  }
  .form-group { min-width: 130px; }
</style>
