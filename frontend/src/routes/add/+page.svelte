<script>
  import { CATEGORIES } from '$lib/utils.js';
  import { api } from '$lib/api.js';
  import { goto } from '$app/navigation';

  let form = $state({
    item: '', company: '', link: '', price: '', quantity: '1',
    notes: '', user: '', category: 'hardware',
  });
  let submitting = $state(false);
  let submitError = $state('');
  let submitSuccess = $state('');

  let computedTotal = $derived((parseFloat(form.price) || 0) * (parseInt(form.quantity) || 1));

  async function submit() {
    submitError = '';
    submitSuccess = '';

    if (!form.item.trim()) { submitError = 'Item name is required.'; return; }
    if (!form.price || isNaN(parseFloat(form.price))) { submitError = 'Valid price is required.'; return; }

    submitting = true;
    try {
      await api.expenses.create({
        ...form,
        price: parseFloat(form.price),
        quantity: parseInt(form.quantity) || 1,
      });
      submitSuccess = '✓ Expense added successfully!';
      form = { item: '', company: '', link: '', price: '', quantity: '1', notes: '', user: '', category: 'hardware' };
      setTimeout(() => goto('/expenses'), 1500);
    } catch (/** @type {any} */ e) {
      submitError = e.message;
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>Add Expense — Westwood Finance</title>
</svelte:head>

<div class="page-header">
  <h1>Add <span>Expense</span></h1>
  <a href="/expenses" class="btn btn-ghost btn-sm">← Back</a>
</div>

<div class="add-layout">
  <div class="card add-card fade-in">
    {#if submitError}
      <div class="error-bar">{submitError}</div>
    {/if}
    {#if submitSuccess}
      <div class="success-bar">{submitSuccess}</div>
    {/if}

    <form onsubmit={e => { e.preventDefault(); submit(); }} id="add-expense-form">
      <div class="form-grid">
        <div class="form-group" style="grid-column:1/-1">
          <label for="ae-item">Item Name *</label>
          <input id="ae-item" type="text" bind:value={form.item} placeholder="e.g. REV Hub" required />
        </div>

        <div class="form-group" style="grid-column:1/-1">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label>Category *</label>
          <div class="category-pills">
            {#each CATEGORIES as cat}
              <button
                type="button"
                class="cat-pill cat-{cat}"
                class:active={form.category === cat}
                onclick={() => form.category = cat}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            {/each}
          </div>
        </div>

        <div class="form-group">
          <label for="ae-company">Company</label>
          <input id="ae-company" type="text" bind:value={form.company} placeholder="e.g. REV Robotics" />
        </div>

        <div class="form-group" style="grid-column:1/-1">
          <label for="ae-link">Purchase Link</label>
          <input id="ae-link" type="url" bind:value={form.link} placeholder="https://…" />
        </div>

        <div class="form-group">
          <label for="ae-price">Unit Price ($) *</label>
          <input id="ae-price" type="number" bind:value={form.price} min="0" step="0.01" placeholder="0.00" required />
        </div>

        <div class="form-group">
          <label for="ae-qty">Quantity</label>
          <input id="ae-qty" type="number" bind:value={form.quantity} min="1" step="1" placeholder="1" />
        </div>

        <div class="form-group">
          <label for="ae-user">Requested By</label>
          <input id="ae-user" type="text" bind:value={form.user} placeholder="Name" />
        </div>

        <div class="form-group" style="grid-column:1/-1">
          <label for="ae-notes">Notes</label>
          <textarea id="ae-notes" bind:value={form.notes} placeholder="Any extra context…" rows="3"></textarea>
        </div>
      </div>

      <div class="total-preview">
        <span class="text-muted">Computed Total</span>
        <strong class="total-val">${computedTotal.toFixed(2)}</strong>
      </div>

      <div style="margin-top:20px;display:flex;gap:10px">
        <button id="submit-expense-btn" type="submit" class="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : '+ Add Expense'}
        </button>
        <a href="/expenses" class="btn btn-ghost">Cancel</a>
      </div>
    </form>
  </div>

  <aside class="tips-card card">
    <div class="card-title">Tips</div>
    <ul class="tips-list">
      <li>Category is strictly enforced — pick the closest match.</li>
      <li>Links to order pages help the team track shipments.</li>
      <li>Total is computed automatically (price × qty).</li>
      <li>Entries are saved securely to the local database.</li>
    </ul>

    <div style="margin-top:20px">
      <div class="card-title">Categories</div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">
        {#each CATEGORIES as cat}
          <span class="badge badge-{cat}">{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
        {/each}
      </div>
    </div>
  </aside>
</div>

<style>
  .add-layout { display: grid; grid-template-columns: 1fr 260px; gap: 24px; align-items: start; }
  @media (max-width: 900px) { .add-layout { grid-template-columns: 1fr; } }

  .total-preview {
    display: flex; align-items: center; justify-content: space-between;
    background: var(--surface-2); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 12px 16px; margin-top: 16px;
  }
  .total-val { font-size: 1.4rem; color: var(--primary); letter-spacing: -0.5px; }

  .success-bar {
    background: rgba(107,203,119,0.12); border: 1px solid rgba(107,203,119,0.3);
    color: #6bcb77; padding: 10px 16px; border-radius: var(--radius-sm);
    font-size: 0.875rem; margin-bottom: 16px;
  }
  .tips-card { padding: 20px; }
  .tips-list { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
  .tips-list li { font-size: 0.85rem; color: var(--text-muted); padding-left: 16px; position: relative; }
  .tips-list li::before { content: '›'; position: absolute; left: 0; color: var(--primary); }

  .category-pills {
    display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px;
  }
  .cat-pill {
    padding: 8px 16px; font-size: 0.85rem; font-weight: 600;
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
</style>
