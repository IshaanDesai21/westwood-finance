<script>
  import { formatCurrency } from '../utils.js';

  let {
    label = '',
    value = '',
    isCurrency = false,
    sub = '',
    accentColor = 'var(--primary)',
    icon = '',
    /** Progress bar value 0–100. If undefined, no bar is shown. */
    progress = undefined,
    progressLabel = '',
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

  {#if progress !== undefined}
    <div class="progress-container">
      <div class="progress-header">
        {#if progressLabel}
          <span class="progress-pct">{progressLabel}</span>
        {:else}
          <span class="progress-pct">{Math.round(progress)}%</span>
        {/if}
      </div>
      <div class="progress-track">
        <div
          class="progress-fill"
          style="width:{Math.min(100, Math.max(0, progress))}%; background:{accentColor}"
        ></div>
      </div>
    </div>
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
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow); }

  .stat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
  }
  .stat-label {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
  }
  .stat-icon { font-size: 1.1rem; }
  .stat-value {
    font-size: 1.6rem;
    font-weight: 700;
    letter-spacing: -0.5px;
    line-height: 1.2;
  }
  .stat-sub { font-size: 0.78rem; color: var(--text-muted); }

  /* ── Progress Bar ────────────────────────────────────────────────────── */
  .progress-container {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 12px;
  }
  .progress-header {
    display: flex;
    justify-content: flex-end;
  }
  .progress-pct {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text);
  }
  .progress-track {
    width: 100%;
    height: 8px;
    background: var(--surface-3);
    border-radius: 99px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    opacity: 1;
  }
</style>
