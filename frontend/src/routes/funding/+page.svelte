<script>
  import { onMount } from 'svelte';
  import {
    fundraising, sponsors, grants, loading, error,
    loadFunding, totalRaised,
  } from '$lib/stores/funding.js';
  import { expenses, totalSpent, loadExpenses } from '$lib/stores/expenses.js';
  import { api } from '$lib/api.js';
  import { formatCurrency, formatDate, CONTRIBUTION_TYPES, GRANT_STATUSES } from '$lib/utils.js';

  let activeTab = $state('fundraising');

  let frForm = $state({ name: '', amount: '', date: '', notes: '' });
  let spForm = $state({ name: '', amount: '', date: '', notes: '', contributionType: 'money' });
  let grForm = $state({ name: '', organization: '', amount: '', status: 'Applied', deadline: '', notes: '' });

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
    } catch(e) { formErr = e.message; } finally { submitting = false; }
  }

  async function addSponsor() {
    submitting = true; formErr = ''; formMsg = '';
    try {
      await api.funding.addSponsor(spForm);
      formMsg = '✓ Sponsor added!';
      spForm = { name: '', amount: '', date: '', notes: '', contributionType: 'money' };
      loadFunding(true);
    } catch(e) { formErr = e.message; } finally { submitting = false; }
  }

  async function addGrant() {
    submitting = true; formErr = ''; formMsg = '';
    try {
      await api.funding.addGrant(grForm);
      formMsg = '✓ Grant added!';
      grForm = { name: '', organization: '', amount: '', status: 'Applied', deadline: '', notes: '' };
      loadFunding(true);
    } catch(e) { formErr = e.message; } finally { submitting = false; }
  }

  let net = $derived($totalRaised - $totalSpent);
  let topSponsors = $derived([...$sponsors].sort((a,b) => b.amount - a.amount).slice(0, 3));
</script>

<svelte:head>
  <title>Funding — Westwood Finance</title>
</svelte:head>

<div class="page-header">
  <h1>Funding <span>&amp; Sponsors</span></h1>
</div>

<!-- ── Summary strip ──────────────────────────────────────────────────────── -->
<div class="stat-grid" style="margin-bottom:28px">
  <div class="card">
    <div class="card-title">Total Raised</div>
    <div style="font-size:1.6rem;font-weight:700;color:#6bcb77">{formatCurrency($totalRaised)}</div>
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
</div>

<!-- ── Tabs ───────────────────────────────────────────────────────────────── -->
<div class="tabs">
  {#each [['fundraising','Fundraising'],['sponsors','Sponsors'],['grants','Grants']] as [key, label]}
    <button class="tab" class:active={activeTab === key} onclick={() => activeTab = key} id="tab-{key}">
      {label}
    </button>
  {/each}
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
            <select id="sp-type" bind:value={spForm.contributionType} required>
              {#each CONTRIBUTION_TYPES as t}
                <option value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>
              {/each}
            </select>
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
      <div class="section-title" style="margin-bottom:12px">Sponsors</div>
      {#if $sponsors.length === 0}
        <div class="empty-state card"><div class="icon">🤝</div>No sponsors yet</div>
      {:else}
        <div class="sponsor-grid">
          {#each [...$sponsors].sort((a,b) => b.amount - a.amount) as sp, i}
            <div class="card sponsor-card" class:top-sponsor={i < 3}>
              {#if i < 3}
                <div class="top-badge">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} Top Sponsor
                </div>
              {/if}
              <div class="sponsor-name">{sp.name}</div>
              <div class="sponsor-amount">{formatCurrency(sp.amount)}</div>
              <span class="badge badge-{sp.contributionType}">
                {sp.contributionType?.charAt(0).toUpperCase() + sp.contributionType?.slice(1)}
              </span>
              {#if sp.notes}
                <div class="sponsor-notes">{sp.notes}</div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
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
            <select id="gr-status" bind:value={grForm.status} required>
              {#each GRANT_STATUSES as s}
                <option value={s}>{s}</option>
              {/each}
            </select>
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
      <div class="section-title" style="margin-bottom:12px">Grant Applications</div>
      {#if $grants.length === 0}
        <div class="empty-state card"><div class="icon">📄</div>No grant applications yet</div>
      {:else}
        <div class="card" style="padding:0;overflow:hidden">
          <table>
            <thead>
              <tr>
                <th>Grant</th><th>Organization</th><th>Deadline</th>
                <th class="text-right">Amount</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {#each $grants as g}
                <tr>
                  <td style="font-weight:500">{g.name}<br>
                    {#if g.notes}<span style="font-size:0.78rem;color:var(--text-muted)">{g.notes}</span>{/if}
                  </td>
                  <td class="text-muted">{g.organization || '—'}</td>
                  <td class="text-muted">{formatDate(g.deadline)}</td>
                  <td class="text-right monospace">{formatCurrency(g.amount)}</td>
                  <td>
                    <span class="badge badge-{g.status?.toLowerCase()}">{g.status}</span>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
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
</style>
