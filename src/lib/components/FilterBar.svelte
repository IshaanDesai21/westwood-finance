<script>
  import { CATEGORIES, TEAMS } from '../utils.js';
  import CustomDropdown from './CustomDropdown.svelte';

  const categoryOptions = [
    { label: 'All Categories', value: '' },
    ...CATEGORIES.map(cat => ({ label: cat.charAt(0).toUpperCase() + cat.slice(1), value: cat }))
  ];

  const teamOptions = [
    { label: 'All Teams', value: '' },
    ...TEAMS.map(team => ({ label: team, value: team }))
  ];

  const statusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Submitted, in review', value: 'Submitted, in review' },
    { label: 'Ordered', value: 'Ordered' },
    { label: 'Received', value: 'Received' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Denied', value: 'Denied' },
    { label: 'Cancelled', value: 'Cancelled' }
  ];

  /** @type {{ onchange?: (f: any) => void, filters: any }} */
  let { onchange, filters = $bindable() } = $props();

  function emit() {
    onchange?.({ ...filters });
  }

  function reset() {
    filters.search = "";
    filters.category = "";
    filters.company = "";
    filters.team = "";
    filters.status = "";
    filters.dateFrom = "";
    filters.dateTo = "";
    emit();
  }
</script>

<div class="filter-bar">
  <div class="filter-row">
    <div class="form-group search-input">
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
      <CustomDropdown 
        options={categoryOptions} 
        bind:value={filters.category} 
        onchange={emit} 
        placeholder="All Categories" 
      />
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
      <label for="filter-team">Team</label>
      <CustomDropdown 
        options={teamOptions} 
        bind:value={filters.team} 
        onchange={emit} 
        placeholder="All Teams" 
      />
    </div>

    <div class="form-group">
      <label for="filter-status">Status</label>
      <CustomDropdown 
        options={statusOptions} 
        bind:value={filters.status} 
        onchange={emit} 
        placeholder="All Statuses" 
      />
    </div>

    <div class="form-group">
      <label for="filter-from">From Date</label>
      <input
        id="filter-from"
        type="date"
        bind:value={filters.dateFrom}
        onchange={emit}
      />
    </div>

    <div class="form-group">
      <label for="filter-to">To Date</label>
      <input
        id="filter-to"
        type="date"
        bind:value={filters.dateTo}
        onchange={emit}
      />
    </div>

    <div class="form-group reset-button" style="justify-content:flex-end;">
      <button class="btn btn-ghost btn-sm" style="width: 100%; height: 42px;" onclick={reset}>Reset</button>
    </div>
  </div>
</div>

<style>
  .filter-bar {
    margin-bottom: 24px;
    padding: 20px;
    border-radius: var(--radius-lg);
    background: linear-gradient(to right, var(--surface), var(--surface-2));
    border: 1px solid var(--border);
    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
  }
  .filter-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 16px;
    align-items: flex-end;
  }
  .filter-bar :global(.form-group) {
    margin-bottom: 0;
  }
  .search-input {
    grid-column: 1 / -1;
  }
</style>
