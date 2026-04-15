<script>
  /** @type {{ status: string }} */
  let { status } = $props();

  /** @type {Record<string, { color: string, bg: string, icon: string }>} */
  const config = {
    'Pending Review':           { color: '#4e9af1', bg: 'rgba(78,154,241,0.12)', icon: '' },
    'Ordered':                  { color: '#f19a4e', bg: 'rgba(241,154,78,0.12)',  icon: '' },
    'Received':                 { color: '#6bcb77', bg: 'rgba(107,203,119,0.12)', icon: '✓' },
    'Approved':                 { color: '#4eeaf1', bg: 'rgba(78,234,241,0.12)',  icon: '' },
    'Denied':                   { color: '#f16a4e', bg: 'rgba(241,106,78,0.12)',  icon: '×' },
    'Cancelled':                { color: '#8a8a8a', bg: 'rgba(138,138,138,0.12)', icon: '' },
  };

  let cfg = $derived(config[status] ?? { color: '#8a8a8a', bg: 'rgba(138,138,138,0.12)', icon: '?' });
</script>

<span class="status-badge" style="color:{cfg.color};background:{cfg.bg}">
  {#if cfg.icon}
    <span class="status-icon">{cfg.icon}</span>
  {/if}
  {status}
</span>

<style>
  .status-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.72rem;
    font-weight: 600;
    white-space: normal;
    text-align: center;
    line-height: 1.2;
    max-width: 90px;
  }
  .status-icon { font-size: 0.78rem; }
</style>
