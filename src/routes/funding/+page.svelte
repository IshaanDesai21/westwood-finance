  import { onMount } from 'svelte';
  import CustomDropdown from '$lib/components/CustomDropdown.svelte';
  import {
    fundraising, sponsors, grants, clubDues, other, loading, error,
    loadFunding, totalRaised,
  } from '$lib/stores/funding.js';
  import { expenses, totalSpent, loadExpenses } from '$lib/stores/expenses.js';
  import { api } from '$lib/api.js';
  import { formatCurrency, formatDate, CONTRIBUTION_TYPES, GRANT_STATUSES } from '$lib/utils.js';

  let activeTab = $state('fundraising');

  let frForm = $state({ name: '', amount: '', date: '', notes: '' });
  let spForm = $state({ name: '', amount: '', date: '', notes: '', contributionType: 'money' });
  let grForm = $state({ name: '', organization: '', amount: '', status: 'Applied', deadline: '', notes: '' });
  let cdForm = $state({ name: '', amount: '', date: '', notes: '' });
  let otForm = $state({ name: '', amount: '', date: '', notes: '' });

  let submitting = $state(false);
  let formMsg = $state('');
  let formErr = $state('');

  onMount(() => { loadFunding(); loadExpenses(); });

  async function addFundraising() {
    submitting = true; formErr = ''; formMsg = '';
    try {
      await api.funding.addFundraising(frForm);
      formMsg = '✓ Fundraising entry added!';
      frForm = { name: '', amount: '', date: '', notes: '' };
      loadFunding(true);
    } catch(e) { formErr = /** @type {any} */ (e)?.message || String(e); } finally { submitting = false; }
  }

  async function addSponsor() {
    submitting = true; formErr = ''; formMsg = '';
    try {
      await api.funding.addSponsor(spForm);
      formMsg = '✓ Sponsor added!';
      spForm = { name: '', amount: '', date: '', notes: '', contributionType: 'money' };
      loadFunding(true);
    } catch(e) { formErr = /** @type {any} */ (e)?.message || String(e); } finally { submitting = false; }
  }

  async function addGrant() {
    submitting = true; formErr = ''; formMsg = '';
    try {
      await api.funding.addGrant(grForm);
      formMsg = '✓ Grant added!';
      grForm = { name: '', organization: '', amount: '', status: 'Applied', deadline: '', notes: '' };
      loadFunding(true);
    } catch(e) { formErr = /** @type {any} */ (e)?.message || String(e); } finally { submitting = false; }
  }

  async function addClubDues() {
    submitting = true; formErr = ''; formMsg = '';
    try {
      await api.funding.addClubDues(cdForm);
      formMsg = '✓ Club Dues entry added!';
      cdForm = { name: '', amount: '', date: '', notes: '' };
      loadFunding(true);
    } catch(e) { formErr = /** @type {any} */ (e)?.message || String(e); } finally { submitting = false; }
  }

  async function addOther() {
    submitting = true; formErr = ''; formMsg = '';
    try {
      await api.funding.addOther(otForm);
      formMsg = '✓ Other income entry added!';
      otForm = { name: '', amount: '', date: '', notes: '' };
      loadFunding(true);
    } catch(e) { formErr = /** @type {any} */ (e)?.message || String(e); } finally { submitting = false; }
  }

  let net = $derived($totalRaised - $totalSpent);
  let otherTotal = $derived($other.reduce((s, r) => s + (r.amount || 0), 0));
</script>

<svelte:head>
  <title>Funding — Westwood Finance</title>
</svelte:head>

<div class="page-header">
  <h1>Funding <span>& Sponsors</span></h1>
</div>

<!-- ── Summary strip ─────────────────────────────────────────────────────── -->
<div class="stat-grid" style="margin-bottom:28px">
  <div class="card">
    <div class="card-title">Total Raised</div>
    <div style="font-size:1.6rem;font-weight:700;color:#6bcb77">{formatCurrency($totalRaised)}</div>
    <div style="font-size:0.76rem;color:var(--text-muted);margin-top:4px">
      Fundraising + Sponsors + Club Dues + Other
    </div>
  </div>
  <div class="card">
    <div class="card-title">Total Spent</div>
    <div style="font-size:1.6rem;font-weight:700;color:var(--primary)">{formatCurrency($totalSpent)}</div>
  </div>
  <div class="card">
    <div class="card-title">Net Balance</div>
    <div style="font-size:1.6rem;font-weight:700;color:{net >= 0 ? '#6bcb77' : '#f16a4e'}">{formatCurrency(net)}</div>
    <div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px">{net >= 0 ? 'Surplus' : 'Deficit'}</div>
  </div>
  <div class="card">
    <div class="card-title">Sponsors</div>
    <div style="font-size:1.6rem;font-weight:700;color:#4e9af1">{$sponsors.length}</div>
  </div>
  <div class="card">
    <div class="card-title">Grants</div>
    <div style="font-size:1.6rem;font-weight:700;color:#b97cf3">{$grants.length}</div>
    <div style="font-size:0.78rem;color:#6bcb77;margin-top:4px">
      {$grants.filter(g => g.status === 'Awarded').length} awarded
    </div>
  </div>
  <div class="card">
    <div class="card-title">Other Income</div>
    <div style="font-size:1.6rem;font-weight:700;color:#f1a94e">{formatCurrency(otherTotal)}</div>
    <div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px">{$other.length} entries</div>
  </div>
</div>

<!-- ── Tabs ──────────────────────────────────────────────────────────────── -->
<div class="tabs-container">
  <div class="segmented-control">
    {#each [['fundraising','Fundraising'],['club-dues','Club Dues'],['sponsors','Sponsors'],['grants','Grants'],['other','Other']] as [key, label]}
      <button class="segment" class:active={activeTab === key} onclick={() => activeTab = key} id="tab-{key}">
        {label}
      </button>
    {/each}
  </div>
</div>

{#if formErr}<div class="error-bar">{formErr}</div>{/if}
{#if formMsg}<div class="success-bar-inline">{formMsg}</div>{/if}

<!-- ══ FUNDRAISING TAB ══════════════════════════════════════════════════════ -->
{#if activeTab === 'fundraising'}
  <div class="tab-layout fade-in">
    <div class="card">
      <h3 style="margin-bottom:16px">Add Income Entry</h3>
      <form onsubmit={e => { e.preventDefault(); addFundraising(); }} id="fundraising-form">
        <div class="form-grid">
          <div class="form-group" style="grid-column:1/-1">
            <label for="fr-name">Source / Event Name *</label>
            <input id="fr-name" type="text" bind:value={frForm.name} placeholder="e.g. Bake Sale, Car Wash" required />
          </div>
          <div class="form-group">
            <label for="fr-amount">Amount Raised ($) *</label>
            <input id="fr-amount" type="number" bind:value={frForm.amount} min="0" step="0.01" required />
          </div>
          <div class="form-group">
            <label for="fr-date">Date</label>
            <input id="fr-date" type="date" bind:value={frForm.date} />
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label for="fr-notes">Notes</label>
            <textarea id="fr-notes" bind:value={frForm.notes} rows="2"></textarea>
          </div>
        </div>
        <button type="submit" class="btn btn-primary" style="margin-top:12px" disabled={submitting}>
          {submitting ? 'Saving…' : '+ Add Entry'}
        </button>
      </form>
    </div>
    <div>
      <div class="section-title" style="margin-bottom:12px">Income History</div>
      {#if $fundraising.length === 0}
        <div class="empty-state card"><div class="icon">💰</div>No fundraising entries yet</div>
      {:else}
        <div class="card" style="padding:0;overflow:hidden">
          <table>
            <thead><tr><th>Source</th><th>Date</th><th>Notes</th><th class="text-right">Amount</th></tr></thead>
            <tbody>
              {#each $fundraising as r}
                <tr>
                  <td style="font-weight:500">{r.name}</td>
                  <td class="text-muted">{formatDate(r.date)}</td>
                  <td class="text-muted">{r.notes || '—'}</td>
                  <td class="text-right monospace" style="color:#6bcb77;font-weight:600">{formatCurrency(r.amount)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </div>

<!-- ══ SPONSORS TAB ═════════════════════════════════════════════════════════ -->
{:else if activeTab === 'sponsors'}
  <div class="tab-layout fade-in">
    <div class="card">
      <h3 style="margin-bottom:16px">Add Sponsor</h3>
      <form onsubmit={e => { e.preventDefault(); addSponsor(); }} id="sponsor-form">
        <div class="form-grid">
          <div class="form-group" style="grid-column:1/-1">
            <label for="sp-name">Sponsor Name *</label>
            <input id="sp-name" type="text" bind:value={spForm.name} placeholder="Company or individual" required />
          </div>
          <div class="form-group">
            <label for="sp-amount">Contribution Value ($)</label>
            <input id="sp-amount" type="number" bind:value={spForm.amount} min="0" step="0.01" />
          </div>
          <div class="form-group">
            <label for="sp-type">Contribution Type *</label>
            <CustomDropdown 
              options={CONTRIBUTION_TYPES} 
              bind:value={spForm.contributionType} 
              required 
            />
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label for="sp-notes">Notes</label>
            <textarea id="sp-notes" bind:value={spForm.notes} rows="2"></textarea>
          </div>
        </div>
        <button type="submit" class="btn btn-primary" style="margin-top:12px" disabled={submitting}>
          {submitting ? 'Saving…' : '+ Add Sponsor'}
        </button>
      </form>
    </div>
    <div>
      <div class="section-title" style="margin-bottom:12px">See 'Fundraising' tab for all entries</div>
    </div>
  </div>

<!-- ══ GRANTS TAB ═══════════════════════════════════════════════════════════ -->
{:else if activeTab === 'grants'}
  <div class="tab-layout fade-in">
    <div class="card">
      <h3 style="margin-bottom:16px">Add Grant Application</h3>
      <form onsubmit={e => { e.preventDefault(); addGrant(); }} id="grant-form">
        <div class="form-grid">
          <div class="form-group" style="grid-column:1/-1">
            <label for="gr-name">Grant Name *</label>
            <input id="gr-name" type="text" bind:value={grForm.name} required placeholder="e.g. FIRST Innovation Grant" />
          </div>
          <div class="form-group">
            <label for="gr-org">Organization</label>
            <input id="gr-org" type="text" bind:value={grForm.organization} placeholder="Granting org" />
          </div>
          <div class="form-group">
            <label for="gr-amount">Amount Requested ($)</label>
            <input id="gr-amount" type="number" bind:value={grForm.amount} min="0" step="0.01" />
          </div>
          <div class="form-group">
            <label for="gr-status">Status *</label>
            <CustomDropdown 
              options={GRANT_STATUSES} 
              bind:value={grForm.status} 
              required 
            />
          </div>
          <div class="form-group">
            <label for="gr-deadline">Deadline</label>
            <input id="gr-deadline" type="date" bind:value={grForm.deadline} />
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label for="gr-notes">Notes</label>
            <textarea id="gr-notes" bind:value={grForm.notes} rows="2"></textarea>
          </div>
        </div>
        <button type="submit" class="btn btn-primary" style="margin-top:12px" disabled={submitting}>
          {submitting ? 'Saving…' : '+ Add Grant'}
        </button>
      </form>
    </div>
    <div>
      <div class="section-title" style="margin-bottom:12px">See 'Fundraising' tab for all entries</div>
    </div>
  </div>

<!-- ══ CLUB DUES TAB ════════════════════════════════════════════════════════ -->
{:else if activeTab === 'club-dues'}
  <div class="tab-layout fade-in">
    <div class="card">
      <h3 style="margin-bottom:16px">Add Club Dues Collection</h3>
      <form onsubmit={e => { e.preventDefault(); addClubDues(); }} id="club-dues-form">
        <div class="form-grid">
          <div class="form-group" style="grid-column:1/-1">
            <label for="cd-name">Member Name *</label>
            <input id="cd-name" type="text" bind:value={cdForm.name} placeholder="Name of student" required />
          </div>
          <div class="form-group">
            <label for="cd-amount">Amount ($) *</label>
            <input id="cd-amount" type="number" bind:value={cdForm.amount} min="0" step="0.01" required />
          </div>
          <div class="form-group">
            <label for="cd-date">Date Paid</label>
            <input id="cd-date" type="date" bind:value={cdForm.date} />
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label for="cd-notes">Notes</label>
            <textarea id="cd-notes" bind:value={cdForm.notes} rows="2"></textarea>
          </div>
        </div>
        <button type="submit" class="btn btn-primary" style="margin-top:12px" disabled={submitting}>
          {submitting ? 'Saving…' : '+ Add Club Dues'}
        </button>
      </form>
    </div>
    <div>
      <div class="section-title" style="margin-bottom:12px">See 'Fundraising' tab for all entries</div>
    </div>
  </div>

<!-- ══ OTHER TAB ════════════════════════════════════════════════════════════ -->
{:else if activeTab === 'other'}
  <div class="tab-layout fade-in">
    <div class="card">
      <h3 style="margin-bottom:16px">Add Other Income</h3>
      <form onsubmit={e => { e.preventDefault(); addOther(); }} id="other-form">
        <div class="form-grid">
          <div class="form-group" style="grid-column:1/-1">
            <label for="ot-name">Source / Description *</label>
            <input id="ot-name" type="text" bind:value={otForm.name} placeholder="e.g. Team donation, Miscellaneous income" required />
          </div>
          <div class="form-group">
            <label for="ot-amount">Amount ($) *</label>
            <input id="ot-amount" type="number" bind:value={otForm.amount} min="0" step="0.01" required />
          </div>
          <div class="form-group">
            <label for="ot-date">Date</label>
            <input id="ot-date" type="date" bind:value={otForm.date} />
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label for="ot-notes">Notes</label>
            <textarea id="ot-notes" bind:value={otForm.notes} rows="2"></textarea>
          </div>
        </div>
        <button type="submit" class="btn btn-primary" style="margin-top:12px" disabled={submitting}>
          {submitting ? 'Saving…' : '+ Add Entry'}
        </button>
      </form>
    </div>
    <div>
      <div class="section-title" style="margin-bottom:12px">See 'Fundraising' tab for all entries</div>
    </div>
  </div>
{/if}

<style>
  .tab-layout { display: grid; grid-template-columns: 340px 1fr; gap: 20px; align-items: start; }
  @media (max-width: 900px) { .tab-layout { grid-template-columns: 1fr; } }

  .sponsor-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
  .sponsor-card { position: relative; padding: 18px; transition: transform 0.15s, box-shadow 0.15s; }
  .sponsor-card:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
  .top-sponsor { border-color: var(--primary); }
  .top-badge { font-size: 0.72rem; color: var(--primary); font-weight: 600; margin-bottom: 8px; }
  .sponsor-name { font-weight: 700; font-size: 1rem; margin-bottom: 4px; }
  .sponsor-amount { font-size: 1.3rem; font-weight: 700; color: #6bcb77; margin-bottom: 8px; }
  .sponsor-notes { font-size: 0.78rem; color: var(--text-muted); margin-top: 8px; }

  .success-bar-inline {
    background: rgba(107,203,119,0.12); border: 1px solid rgba(107,203,119,0.3);
    color: #6bcb77; padding: 8px 14px; border-radius: var(--radius-sm);
    font-size: 0.875rem; margin-bottom: 16px;
  }
  .tabs-container { display: flex; justify-content: center; margin-bottom: 24px; }
  .segmented-control {
    display: inline-flex; background: var(--surface-2); padding: 4px;
    border-radius: 99px; border: 1px solid var(--border); flex-wrap: wrap; gap: 2px;
  }
  .segment {
    background: transparent; border: none; padding: 8px 16px;
    font-size: 0.875rem; font-weight: 600; color: var(--text-muted);
    border-radius: 99px; cursor: pointer; transition: all 0.2s;
  }
  .segment:hover { color: var(--text); }
  .segment.active {
    background: var(--surface); color: var(--primary);
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
</style>
