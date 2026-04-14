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
    { label: 'Submitted and in review', value: 'Submitted and in review' },
    { label: 'Ordered', value: 'Ordered' },
    { label: 'Received', value: 'Received' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Denied', value: 'Denied' },
    { label: 'Cancelled', value: 'Cancelled' }
  ];

  let { onchange } = $props();

  let filters = $state({
    search: "",
    category: "",
    company: "",
    team: "",
    status: "",
    dateFrom: "",
    dateTo: "",
  });

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

    <div class="form-group" style="flex:1; min-width:160px">
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

    <div class="form-group" style="flex:1; min-width:160px">
      <label for="filter-team">Team</label>
      <CustomDropdown 
        options={teamOptions} 
        bind:value={filters.team} 
        onchange={emit} 
        placeholder="All Teams" 
      />
    </div>

    <div class="form-group" style="flex:1; min-width:160px">
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

    <div class="form-group" style="justify-content:flex-end; padding-top:20px">
      <button class="btn btn-ghost btn-sm" onclick={reset}>Reset</button>
    </div>
  </div>
</div>

<style>
  .filter-bar {
    margin-bottom: 16px;
    padding: 16px;
  }
  .filter-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: flex-end;
  }
</style>
