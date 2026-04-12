<script>
  import { formatCurrency } from '../utils.js';

  let {
    label = '',
    value = '',
    isCurrency = false,
    sub = '',
    accentColor = 'var(--primary)',
    icon = '',
  } = $props();
</script>

<div class="stat-card">
  <div class="stat-header">
    <span class="stat-label">{label}</span>
    {#if icon}
      <span class="stat-icon" style="color:{accentColor}">{icon}</span>
    {/if}
  </div>
  <div class="stat-value" style="color:{accentColor}">
    {isCurrency ? formatCurrency(value) : value}
  </div>
  {#if sub}
    <div class="stat-sub">{sub}</div>
  {/if}
</div>

<style>
  .stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px 20px;
    box-shadow: var(--shadow-sm);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
  .stat-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .stat-label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }
  .stat-icon { font-size: 1.1rem; }
  .stat-value { font-size: 1.6rem; font-weight: 700; letter-spacing: -0.5px; line-height: 1.2; }
  .stat-sub { font-size: 0.78rem; color: var(--text-muted); margin-top: 4px; }
</style>
