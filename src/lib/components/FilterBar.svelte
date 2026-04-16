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

<div class="filter-bar fade-in">
  <div class="filter-main">
    <div class="search-input">
      <div class="input-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="search-icon"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input
          id="filter-search"
          type="search"
          placeholder="Filter requests, vendors, or notes..."
          bind:value={filters.search}
          oninput={emit}
        />
      </div>
    </div>
    
    <button class="btn btn-ghost btn-sm reset-button" onclick={reset} title="Reset filters">
       <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
    </button>
  </div>

  <div class="filter-grid">
    <div class="filter-field">
      <span class="field-label">Category</span>
      <CustomDropdown 
        options={categoryOptions} 
        bind:value={filters.category} 
        onchange={emit} 
      />
    </div>

    <div class="filter-field">
      <span class="field-label">Vendor</span>
      <input
        id="filter-company"
        type="text"
        placeholder="Any vendor"
        bind:value={filters.company}
        oninput={emit}
      />
    </div>

    <div class="filter-field">
      <span class="field-label">Team</span>
      <CustomDropdown 
        options={teamOptions} 
        bind:value={filters.team} 
        onchange={emit} 
      />
    </div>

    <div class="filter-field">
      <span class="field-label">Status</span>
      <CustomDropdown 
        options={statusOptions} 
        bind:value={filters.status} 
        onchange={emit} 
      />
    </div>

    <div class="filter-field">
      <span class="field-label">Timeline</span>
      <div class="date-range">
        <input type="date" bind:value={filters.dateFrom} onchange={emit} />
        <span class="connector">→</span>
        <input type="date" bind:value={filters.dateTo} onchange={emit} />
      </div>
    </div>
  </div>
</div>

<style>
  .filter-bar {
    margin-bottom: 24px;
    padding: 20px;
    border-radius: var(--radius);
    background: var(--surface);
    border: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  
  .filter-main {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .search-input {
    flex: 1;
  }
  
  .filter-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 16px;
    align-items: flex-end;
  }

  /* Wide screen desktop layout */
  @media (min-width: 1000px) {
    .filter-grid {
      grid-template-columns: repeat(4, 1fr) 280px;
    }
  }

  .filter-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .field-label {
    font-size: 0.65rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-dim);
  }
  
  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }
  
  .search-icon {
    position: absolute;
    left: 14px;
    color: var(--text-dim);
    pointer-events: none;
  }
  
  .input-wrapper input {
    padding-left: 40px;
    height: 44px;
    background: var(--surface-2);
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
  }

  .date-range {
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 0 8px;
  }

  .date-range input {
    background: transparent;
    border: none;
    padding: 8px 4px;
    font-size: 0.8rem;
    width: 100px;
  }

  .connector {
    color: var(--text-dim);
    font-size: 0.8rem;
  }

  .reset-button {
    width: 44px;
    height: 44px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
  }
</style>
