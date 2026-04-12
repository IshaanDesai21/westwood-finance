<script>
  import { onMount } from 'svelte';
  import { budgetCategories, budgetTotal, budgetLoading, budgetError, loadBudget, saveBudget } from '$lib/stores/budget.js';
  import { formatCurrency } from '$lib/utils.js';
  import { api } from '$lib/api.js';

  let currentPassword = '';

  const CATEGORY_META = /** @type {Record<string, {label:string, color:string, icon:string}>} */ ({
    hardware:      { label: 'Hardware',      color: 'var(--cat-hardware)',      icon: '🔧' },
    software:      { label: 'Software',      color: 'var(--cat-software)',      icon: '💻' },
    outreach:      { label: 'Outreach',      color: 'var(--cat-outreach)',      icon: '🤝' },
    food:          { label: 'Food',          color: '#f1a94e',                  icon: '🍕' },
    miscellaneous: { label: 'Miscellaneous', color: 'var(--cat-miscellaneous)', icon: '📦' },
  });

  let unlocked = $state(false);
  let passwordInput = $state('');
  let authError = $state('');

  // Local editable copy of budgets
  /** @type {Record<string,number>} */
  let draftBudgets = $state({});
  let saving = $state(false);
  let saveMsg = $state('');
  let saveErr = $state('');

  onMount(async () => {
    await loadBudget();
    resetDraft();
  });

  function resetDraft() {
    draftBudgets = { ...$budgetCategories };
  }

  async function tryUnlock() {
    try {
      await api.auth.verify(passwordInput);
      unlocked = true;
      authError = '';
      currentPassword = passwordInput;
      passwordInput = '';
    } catch (e) {
      authError = 'Incorrect password.';
      passwordInput = '';
    }
  }

  async function handleSave() {
    saving = true; saveMsg = ''; saveErr = '';
    try {
      await saveBudget(draftBudgets, currentPassword);
      saveMsg = '✓ Budget saved successfully!';
    } catch (/** @type {any} */ e) {
      saveErr = e?.message || String(e);
    } finally {
      saving = false;
    }
  }

  let draftTotal = $derived(Object.values(draftBudgets).reduce((s, v) => s + (Number(v) || 0), 0));
</script>

<svelte:head>
  <title>Manager — Westwood Finance</title>
</svelte:head>

{#if !unlocked}
  <!-- ── Lock Screen ──────────────────────────────────────────────────────── -->
  <div class="lock-screen">
    <div class="lock-card">
      <div class="lock-icon">⚙</div>
      <h1>Manager Access</h1>
      <p class="text-muted" style="margin-bottom:24px;font-size:0.9rem">
        Enter the admin password to access the budget manager.
      </p>
      {#if authError}
        <div class="error-bar" style="margin-bottom:16px">{authError}</div>
      {/if}
      <form onsubmit={e => { e.preventDefault(); tryUnlock(); }} id="manager-login-form">
        <div class="form-group" style="margin-bottom:16px">
          <label for="manager-password">Password</label>
          <input
            id="manager-password"
            type="password"
            bind:value={passwordInput}
            placeholder="Enter admin password"
            autocomplete="current-password"
          />
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%">Unlock</button>
      </form>
    </div>
  </div>
{:else}
  <!-- ── Manager Panel ────────────────────────────────────────────────────── -->
  <div class="page-header">
    <h1>Manager <span>Budget Settings</span></h1>
    <div style="display:flex;gap:8px;align-items:center">
      <span class="unlocked-badge">🔓 Admin Mode</span>
    </div>
  </div>

  <div class="manager-layout">
    <!-- ── Budget Editor ───────────────────────────────────────────────── -->
    <div class="card editor-card">
      <h3 style="margin-bottom:4px">Category Budgets</h3>
      <p class="text-muted" style="font-size:0.85rem;margin-bottom:24px">
        Set the spending budget for each category. These are reflected on the dashboard.
      </p>

      {#if $budgetError}
        <div class="error-bar">{$budgetError}</div>
      {/if}
      {#if saveErr}
        <div class="error-bar">{saveErr}</div>
      {/if}
      {#if saveMsg}
        <div class="success-bar">{saveMsg}</div>
      {/if}

      {#if $budgetLoading && Object.keys(draftBudgets).length === 0}
        <div class="empty-state"><span class="spinning">↻</span> Loading…</div>
      {:else}
        <div class="budget-editor">
          {#each Object.entries(CATEGORY_META) as [cat, meta]}
            <div class="budget-editor-row">
              <div class="cat-label">
                <span class="cat-icon">{meta.icon}</span>
                <span style="font-weight:600;color:{meta.color}">{meta.label}</span>
              </div>
              <div class="form-group" style="flex:1">
                <label for="budget-{cat}" class="sr-only">{meta.label} budget</label>
                <div class="input-dollar">
                  <span class="dollar-sign">$</span>
                  <input
                    id="budget-{cat}"
                    type="number"
                    min="0"
                    step="1"
                    bind:value={draftBudgets[cat]}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          {/each}
        </div>

        <div class="total-row">
          <span class="text-muted" style="font-size:0.875rem">Total Budget</span>
          <span style="font-size:1.4rem;font-weight:700;color:var(--primary)">{formatCurrency(draftTotal)}</span>
        </div>

        <div style="display:flex;gap:10px;margin-top:20px">
          <button class="btn btn-primary" onclick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Budget'}
          </button>
          <button class="btn btn-ghost" onclick={resetDraft}>Reset</button>
        </div>
      {/if}
    </div>

    <!-- ── Budget Summary ──────────────────────────────────────────────── -->
    <div>
      <div class="section-title" style="margin-bottom:12px">Current Budget Allocation</div>
      <div class="allocation-cards">
        {#each Object.entries(CATEGORY_META) as [cat, meta]}
          {@const budget = $budgetCategories[cat] || 0}
          {@const pct = $budgetTotal > 0 ? (budget / $budgetTotal) * 100 : 0}
          <div class="card alloc-card">
            <div class="alloc-icon">{meta.icon}</div>
            <div class="alloc-label" style="color:{meta.color}">{meta.label}</div>
            <div class="alloc-amount">{formatCurrency(budget)}</div>
            <div class="alloc-bar-track">
              <div class="alloc-bar-fill" style="width:{pct}%;background:{meta.color}"></div>
            </div>
            <div class="alloc-pct text-muted">{pct.toFixed(0)}% of total</div>
          </div>
        {/each}
      </div>

      <div class="card total-card">
        <div class="card-title">Total Season Budget</div>
        <div style="font-size:2rem;font-weight:700;color:var(--primary)">{formatCurrency($budgetTotal)}</div>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px">
          Across {Object.keys(CATEGORY_META).length} categories
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* ── Lock Screen ──────────────────────────────────────────────────────────── */
  .lock-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 70vh;
  }
  .lock-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 48px 40px;
    width: 100%;
    max-width: 400px;
    text-align: center;
    box-shadow: var(--shadow-lg);
  }
  .lock-icon { font-size: 3rem; margin-bottom: 16px; }

  /* ── Manager Panel ────────────────────────────────────────────────────────── */
  .unlocked-badge {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--primary);
    background: var(--primary-glow);
    border: 1px solid rgba(224,123,48,0.3);
    padding: 4px 10px;
    border-radius: 999px;
  }

  .manager-layout {
    display: grid;
    grid-template-columns: 420px 1fr;
    gap: 24px;
    align-items: start;
  }
  @media (max-width: 1000px) { .manager-layout { grid-template-columns: 1fr; } }

  .editor-card { padding: 28px; }

  .budget-editor {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .budget-editor-row {
    display: grid;
    grid-template-columns: 160px 1fr;
    gap: 12px;
    align-items: center;
  }

  .cat-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
  }
  .cat-icon { font-size: 1.1rem; }

  .input-dollar {
    position: relative;
    display: flex;
    align-items: center;
  }
  .dollar-sign {
    position: absolute;
    left: 12px;
    color: var(--text-muted);
    font-weight: 600;
    pointer-events: none;
  }
  .input-dollar input { padding-left: 28px; }

  .total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
  }

  /* ── Allocation Cards ─────────────────────────────────────────────────────── */
  .allocation-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }
  .alloc-card {
    padding: 16px;
    text-align: center;
  }
  .alloc-icon { font-size: 1.5rem; margin-bottom: 8px; }
  .alloc-label { font-weight: 600; font-size: 0.85rem; margin-bottom: 4px; }
  .alloc-amount { font-size: 1.2rem; font-weight: 700; margin-bottom: 10px; }
  .alloc-bar-track {
    height: 4px;
    background: var(--surface-2);
    border-radius: 999px;
    overflow: hidden;
    margin-bottom: 6px;
  }
  .alloc-bar-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.4s ease;
  }
  .alloc-pct { font-size: 0.75rem; }

  .total-card {
    padding: 20px;
    text-align: center;
    border: 1px solid var(--primary);
    background: var(--primary-glow);
  }

  .success-bar {
    background: rgba(107,203,119,0.12);
    border: 1px solid rgba(107,203,119,0.3);
    color: #6bcb77;
    padding: 10px 16px;
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
    margin-bottom: 16px;
  }
</style>
