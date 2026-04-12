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

    <div class="form-group" style="flex:3; min-width:250px">
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label>Category</label>
      <div class="category-pills">
        <button
          type="button"
          class="cat-pill"
          class:active={filters.category === ''}
          onclick={() => { filters.category = ''; emit(); }}
        >
          All
        </button>
        {#each CATEGORIES as cat}
          <button
            type="button"
            class="cat-pill cat-{cat}"
            class:active={filters.category === cat}
            onclick={() => { filters.category = cat; emit(); }}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        {/each}
      </div>
    </div>

    <div class="form-group">
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label>Company</label>
      <input
        type="text"
        placeholder="Any company"
        bind:value={filters.company}
        oninput={emit}
      />
    </div>

    <div class="form-group">
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label>User</label>
      <input
        type="text"
        placeholder="Any user"
        bind:value={filters.user}
        oninput={emit}
      />
    </div>

    <div class="form-group">
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label>From</label>
      <input type="date" bind:value={filters.dateFrom} onchange={emit} />
    </div>

    <div class="form-group">
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label>To</label>
      <input type="date" bind:value={filters.dateTo} onchange={emit} />
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

  .category-pills {
    display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px;
  }
  .cat-pill {
    padding: 6px 14px; font-size: 0.8rem; font-weight: 600;
    border-radius: 99px; border: 1px solid var(--border);
    background: transparent; color: var(--text-muted);
    cursor: pointer; transition: all 0.2s;
  }
  .cat-pill:hover { background: var(--surface-2); color: var(--text); }
  .cat-pill.active { border-color: transparent; color: #fff; box-shadow: var(--shadow-sm); }
  .cat-pill.active.cat-hardware { background: var(--cat-hardware); }
  .cat-pill.active.cat-software { background: var(--cat-software); }
  .cat-pill.active.cat-outreach { background: var(--cat-outreach); }
  .cat-pill.active.cat-miscellaneous { background: var(--cat-miscellaneous); }
  /* For the "All" button active state */
  .cat-pill.active:not(.cat-hardware):not(.cat-software):not(.cat-outreach):not(.cat-miscellaneous) {
    background: var(--text); color: var(--surface);
  }
</style>
