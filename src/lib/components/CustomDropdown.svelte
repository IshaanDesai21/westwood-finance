<script>
  import { onMount, tick } from 'svelte';

  let { 
    options = [], 
    value = $bindable(''), 
    placeholder = 'Select...', 
    onchange 
  } = $props();

  let isOpen = $state(false);
  let dropdownRef = $state();

  function toggle() {
    isOpen = !isOpen;
  }

  function select(optValue) {
    value = optValue;
    isOpen = false;
    onchange?.({ target: { value: optValue } }); // Mimic native event for compatibility
  }

  function handleClickOutside(event) {
    if (dropdownRef && !dropdownRef.contains(event.target)) {
      isOpen = false;
    }
  }

  onMount(() => {
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  });

  // Helper to get display label
  let selectedLabel = $derived(() => {
    const opt = options.find(o => (typeof o === 'string' ? o : o.value) === value);
    if (!opt) return placeholder;
    return typeof opt === 'string' ? opt.charAt(0).toUpperCase() + opt.slice(1) : opt.label;
  });
</script>

<div class="custom-dropdown" bind:this={dropdownRef}>
  <button 
    type="button" 
    class="dropdown-trigger" 
    class:active={isOpen} 
    onclick={toggle}
    aria-haspopup="listbox"
    aria-expanded={isOpen}
  >
    <span class="label">{selectedLabel()}</span>
    <span class="chevron" class:open={isOpen}>
      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>
  </button>

  {#if isOpen}
    <ul class="dropdown-menu fade-in" role="listbox">
      {#each options as opt}
        {@const val = typeof opt === 'string' ? opt : opt.value}
        {@const label = typeof opt === 'string' ? opt.charAt(0).toUpperCase() + opt.slice(1) : opt.label}
        <li 
          class="dropdown-item" 
          class:selected={value === val}
          onclick={() => select(val)}
          role="option"
          aria-selected={value === val}
        >
          {label}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .custom-dropdown {
    position: relative;
    width: 100%;
    user-select: none;
  }

  .dropdown-trigger {
    width: 100%;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 9px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    color: var(--text);
    transition: all 0.2s ease;
    text-align: left;
    outline: none;
    font-size: 0.9rem;
  }

  .dropdown-trigger:hover {
    border-color: var(--primary);
    background: var(--surface-3);
  }

  .dropdown-trigger.active {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-glow);
  }

  .label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-right: 8px;
  }

  .chevron {
    flex-shrink: 0;
    transition: transform 0.2s ease;
    color: var(--text-muted);
  }

  .chevron.open {
    transform: rotate(180deg);
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    width: 100%;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    z-index: 100;
    max-height: 240px;
    overflow-y: auto;
    box-shadow: var(--shadow-lg);
    padding: 4px;
    list-style: none;
    margin: 0;
  }

  .dropdown-item {
    padding: 10px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.15s ease;
    color: var(--text-muted);
  }

  .dropdown-item:hover {
    background: var(--surface-3);
    color: var(--text);
  }

  .dropdown-item.selected {
    background: var(--primary-glow);
    color: var(--primary);
    font-weight: 600;
  }

  /* Scrollbar styling */
  .dropdown-menu::-webkit-scrollbar {
    width: 6px;
  }
  .dropdown-menu::-webkit-scrollbar-track {
    background: transparent;
  }
  .dropdown-menu::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 10px;
  }
</style>
