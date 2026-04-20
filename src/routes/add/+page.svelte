<script>
  import { CATEGORIES, TEAMS, formatDate } from "$lib/utils.js";
  import { goto } from "$app/navigation";
  import CustomDropdown from "$lib/components/CustomDropdown.svelte";
  import AdminLock from "$lib/components/AdminLock.svelte";
  import { dataService } from "$lib/dataService.svelte.js";
  import { BASE_URL, SECRET_KEY } from "$lib/config.js";
  import { fade, scale } from "svelte/transition";

  const teamOptions = TEAMS.map((/** @type {string} */ team) => ({
    label: team,
    value: team,
  }));


  let form = $state({
    destination: "sheets",
    item: "",
    company: "",
    link: "",
    price: "",
    quantity: "1",
    notes: "",
    team: "",
    category: "hardware",
    uuid: "",
    orderedBy: "",
    isExpense: false, // Tracks if adding as immediate expense
  });

  let submitting = $state(false);
  let submitError = $state("");
  let submitSuccess = $state("");
  let computedTotal = $derived(
    (parseFloat(form.price) || 0) * (parseInt(form.quantity) || 1),
  );

  let showPassword = $state(false);
  let showTestModal = $state(false);
  let testPasswordInput = $state("");
  let testModalError = $state("");

  /** 🤖 TEST DATA GENERATOR */
  function openTestModal() {
    showTestModal = true;
    testPasswordInput = "";
    testModalError = "";
  }

  function handleTestSubmit() {
    if (testPasswordInput === "hi") {
      fillTestOrder();
      showTestModal = false;
    } else {
      testModalError = "Invalid test password.";
    }
  }

  function fillTestOrder() {
    const items = ["REV UltraPlanetary Motor", "Spark Max Controller", "Neo Brushless Motor", "Expansion Hub", "3D Printing Filament", "Metric Bolt Set", "Through-Bore Encoder", "Aluminum Extrusion (1x1)", "Soldering Station", "Zip Ties (Bulk)"];
    const companies = ["REV Robotics", "Amazon", "McMaster-Carr", "VEX Robotics", "AndyMark", "DigiKey"];
    const categories = ["hardware", "hardware", "hardware", "miscellaneous", "miscellaneous"];
    
    form.item = items[Math.floor(Math.random() * items.length)];
    form.company = companies[Math.floor(Math.random() * companies.length)];
    form.price = (Math.random() * 80 + 5).toFixed(2);
    form.quantity = Math.floor(Math.random() * 4 + 1).toString();
    form.team = "FRC";
    form.category = categories[Math.floor(Math.random() * categories.length)];
    form.notes = "Website Test";
    form.link = "https://example.com/item-" + Math.floor(Math.random() * 1000);
    form.orderedBy = "Test Bot";
  }

  async function submit() {
    submitError = "";
    submitSuccess = "";

    const required = {
      "Item name": form.item,
      "Vendor/Company": form.company,
      "Price": form.price,
      "Quantity": form.quantity,
      "Team": form.team,
      "Category": form.category,
      "Ordered By": form.orderedBy
    };

    const missing = Object.entries(required)
      .filter(([_, v]) => !v || !String(v).trim())
      .map(([k]) => k);

    if (missing.length > 0) {
      submitError = `The following fields are required: ${missing.join(", ")}.`;
      return;
    }

    if (isNaN(parseFloat(form.price)) || parseFloat(form.price) < 0) {
      submitError = "Please enter a valid numeric unit price.";
      return;
    }

    submitting = true;

    try {
      // ✅ Link Auto-Fix: Prepend https:// if missing
      let finalLink = form.link.trim();
      if (finalLink && !finalLink.startsWith("http")) {
        // More robust check: if it contains a dot or doesn't have a protocol, add it
        finalLink = "https://" + finalLink;
      }

      // ✅ FIX: force all values to strings for URLSearchParams
      const params = new URLSearchParams({
        action: "addOrder",
        key: SECRET_KEY,
        item: form.item,
        company: form.company,
        link: finalLink,
        price: String(form.price),
        quantity: String(form.quantity),
        notes: form.notes,
        category: form.category,
        team: form.team,
        // ✅ Spreadsheet Formula for Total: =Dx*Ex
        total: "=INDIRECT(\"D\"&ROW())*INDIRECT(\"E\"&ROW())",
        status: form.isExpense ? "Received" : "Pending Review",
        tracking: "",
        uuid: form.uuid,
        timestamp: formatDate(new Date()),
        orderedBy: form.orderedBy,
      });

      const url = `${BASE_URL}?${params.toString()}`;

      const response = await fetch(url);
      const result = await response.json();

      console.log("API result:", result);

      if (!response.ok || result.error) {
        throw new Error(result.error || "Request failed");
      }

      submitSuccess = "✓ Order successfully sent! Redirecting to dashboard...";
      submitting = false; // ← release the button immediately
      
      // ⚡ Optimistic Update: inject order into local store instantly
      dataService.addOrderOptimistic({
        item: form.item,
        company: form.company,
        link: finalLink,
        price: Number(form.price) || 0,
        quantity: Number(form.quantity) || 1,
        notes: form.notes,
        category: form.category,
        team: form.team,
        status: form.isExpense ? "Received" : "Pending Review",
        timestamp: formatDate(new Date()),
        orderedBy: form.orderedBy,
      });

      // reset form
      form = {
        destination: "sheets",
        item: "",
        company: "",
        link: "",
        price: "",
        quantity: "1",
        notes: "",
        team: form.team, // Preserve team for convenience
        category: "hardware",
        uuid: "",
        orderedBy: form.orderedBy, // Preserve name for convenience
        isExpense: false,
      };

      setTimeout(() => goto("/orders"), 2500);
    } catch (e) {
      // ✅ FIX: proper error typing
      if (e instanceof Error) {
        submitError = e.message;
      } else {
        submitError = "Unknown error occurred";
      }
    } finally {
      // Only set false here if we haven't already (success path sets it earlier)
      if (submitting) submitting = false;
    }
  }
  function toggleExpenseMode() {
    if (form.isExpense) {
      form.isExpense = false;
      return;
    }
    showExpenseModal = true;
  }

  let showExpenseModal = $state(false);
</script>

<svelte:head>
  <title>Add Order | Westwood Finance</title>
</svelte:head>

<div class="page-header">
  <div class="header-left">
    <h1>New <span>Order</span></h1>
    <p class="text-muted">Fill out the form below to request a new purchase</p>
  </div>
  
  <div class="header-right">
    <div class="header-actions">
      <button 
        class="btn btn-ghost btn-sm" 
        onclick={openTestModal}
        title="Autofill for validation"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
        Test Order
      </button>
      
      <button 
        class="btn btn-sm {form.isExpense ? 'btn-primary' : 'btn-ghost'}" 
        onclick={toggleExpenseMode}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
        {form.isExpense ? "Expense Mode" : "Instant Expense"}
      </button>
      
      <a href="/orders" class="btn btn-ghost btn-sm">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Back
      </a>
    </div>
  </div>
</div>

<div class="add-layout-wide fade-in">
  {#if showExpenseModal}
    <div class="lock-screen-wrapper fade-in" style="position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center;">
      <div style="position: relative; width: 100%; max-width: 380px;">
        <AdminLock 
          onunlock={() => { form.isExpense = true; showExpenseModal = false; }} 
          oncancel={() => { showExpenseModal = false; }}
          title="Admin Access" 
          description="You need the admin password to record an immediate expense."
        />
      </div>
    </div>
  {:else}
    <div class="card add-card">
      {#if submitError}
        <div class="error-bar message-bar">
           <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
           {submitError}
        </div>
      {/if}
      {#if submitSuccess}
        <div class="success-bar message-bar">
           <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
           {submitSuccess}
        </div>
      {/if}

      <form
        onsubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        id="add-expense-form"
      >
        <div class="form-grid">
          <div class="form-group span-2">
            <label for="ae-item">Item Name *</label>
            <input
              id="ae-item"
              type="text"
              bind:value={form.item}
              placeholder="e.g. REV Control Hub"
              required
            />
          </div>

          <div class="form-group span-2">
            <div id="category-label" class="form-label" style="margin-bottom: 8px;">Category *</div>
            <div class="category-pills" role="group" aria-labelledby="category-label">
              {#each CATEGORIES as cat}
                <button
                  type="button"
                  class="cat-pill cat-{cat}"
                  class:active={form.category === cat}
                  onclick={() => (form.category = cat)}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              {/each}
            </div>
          </div>

          <div class="form-group">
            <label for="ae-company">Vendor / Supplier</label>
            <input
              id="ae-company"
              type="text"
              bind:value={form.company}
              placeholder="GoBilda, REV, etc."
            />
          </div>

          <div class="form-group">
            <label for="ae-team">Team *</label>
            <CustomDropdown
              options={teamOptions}
              bind:value={form.team}
            />
          </div>

          <div class="form-group">
            <label for="ae-orderedby">Ordered By</label>
            <input
              id="ae-orderedby"
              type="text"
              bind:value={form.orderedBy}
              placeholder="Your name"
            />
          </div>

          <div class="form-group span-2">
            <label for="ae-link">Reference Link</label>
            <div class="input-with-icon">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; left: 12px; color: var(--text-dim)"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
               <input
                 id="ae-link"
                 type="text"
                 bind:value={form.link}
                 placeholder="https://..."
                 style="padding-left: 38px;"
               />
            </div>
          </div>

          <div class="form-group">
            <label for="ae-price">Unit Price ($) *</label>
            <input
              id="ae-price"
              type="number"
              bind:value={form.price}
              min="0"
              step="0.01"
              placeholder="0.00"
              required
            />
          </div>

          <div class="form-group">
            <label for="ae-qty">Quantity</label>
            <input
              id="ae-qty"
              type="number"
              bind:value={form.quantity}
              min="1"
              step="1"
              placeholder="1"
            />
          </div>

          <div class="form-group span-2">
            <label for="ae-notes">Team Notes</label>
            <textarea
              id="ae-notes"
              bind:value={form.notes}
              placeholder="Promo codes, notes, etc."
              rows="3"
            ></textarea>
          </div>
        </div>

        <div class="summary-section">
          <div class="total-preview">
            <strong class="total-title">Order Total</strong>
            <strong class="total-val amount">${computedTotal.toFixed(2)}</strong>
          </div>
        </div>

        <div class="form-footer">
          <button
            id="submit-expense-btn"
            type="submit"
            class="btn btn-primary btn-block"
            disabled={submitting}
          >
            {#if submitting}
              <span class="spinning" style="margin-right: 8px;">↻</span> Processing...
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              {form.isExpense ? "Confirm Immediate Expense" : "Submit Order Request"}
            {/if}
          </button>
          <a href="/orders" class="btn btn-ghost btn-block">Abort Transaction</a>
        </div>
      </form>
    </div>
  {/if}

  {#if showTestModal}
    <div class="modal-overlay" transition:fade={{ duration: 200 }}>
      <div class="modal-card test-modal" transition:scale={{ duration: 300, start: 0.95 }}>
        <div class="modal-header">
            <h3>Test Data Authentication</h3>
            <button class="close-btn" onclick={() => showTestModal = false}>&times;</button>
        </div>
        <div class="modal-body">
            <p class="modal-desc">Enter the test password to populate the form with randomized drone and robotics parts.</p>
            
            <div class="test-input-group">
                <input 
                    type="password" 
                    placeholder="Enter password" 
                    bind:value={testPasswordInput}
                    onkeydown={(e) => e.key === 'Enter' && handleTestSubmit()}
                />
                {#if testModalError}
                    <span class="test-error">{testModalError}</span>
                {/if}
            </div>
            
            <button class="btn btn-primary btn-block" onclick={handleTestSubmit}>
                Authenticate & Fill
            </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(10, 11, 14, 0.8);
    backdrop-filter: blur(8px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .modal-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    width: 100%;
    max-width: 400px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    overflow: hidden;
  }

  .modal-header {
    padding: 20px 24px;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .modal-header h3 { margin: 0; font-size: 1.1rem; color: #fff; }
  .close-btn { background: none; border: none; color: var(--text-dim); font-size: 1.5rem; cursor: pointer; }

  .modal-body { padding: 24px; }
  .modal-desc { font-size: 0.9rem; color: var(--text-dim); margin-bottom: 24px; line-height: 1.5; }

  .test-input-group { margin-bottom: 24px; }
  .test-input-group input {
    width: 100%;
    background: var(--surface-2);
    border: 1px solid var(--border);
    padding: 12px 16px;
    border-radius: var(--radius-sm);
    color: #fff;
    font-size: 1rem;
    outline: none;
    transition: all 0.2s;
  }
  .test-input-group input:focus { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2); }
  .test-error { color: #ef4444; font-size: 0.75rem; font-weight: 600; margin-top: 8px; display: block; }

  .header-actions { display: flex; gap: 8px; align-items: center; }
  
  .add-layout-wide {
    max-width: 720px;
    margin: 0 auto 80px;
  }

  .add-card {
    padding: 40px;
    border: 1px solid var(--border);
    box-shadow: var(--shadow-xl);
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    margin-bottom: 32px;
  }

  .span-2 { grid-column: span 2; }

  .input-with-icon { position: relative; display: flex; align-items: center; }

  .message-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 24px;
    border: 1px solid transparent;
  }

  .success-bar {
    background: rgba(16, 185, 129, 0.08);
    border-color: rgba(16, 185, 129, 0.2);
    color: var(--status-received);
  }

  .error-bar {
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.2);
    color: var(--status-rejected);
  }

  .category-pills {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 8px;
  }
  
  .cat-pill {
    padding: 8px 16px;
    font-size: 0.725rem;
    font-weight: 700;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.2s;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .cat-pill:hover { background: var(--surface-3); color: #fff; }
  .cat-pill.active {
    color: #fff;
    border-color: transparent;
    box-shadow: 0 0 12px rgba(0,0,0,0.2);
  }
  
  .cat-pill.active.cat-hardware { background: var(--cat-hardware); }
  .cat-pill.active.cat-software { background: var(--cat-software); }
  .cat-pill.active.cat-outreach { background: var(--cat-outreach); }
  .cat-pill.active.cat-food { background: #f97316; }
  .cat-pill.active.cat-miscellaneous { background: var(--cat-miscellaneous); }

  .summary-section {
    padding: 24px;
    background: var(--surface-2);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    margin-bottom: 32px;
  }

  .total-preview {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .total-title { font-size: 1.1rem; font-weight: 700; color: #fff; text-transform: uppercase; letter-spacing: 0.05em; }
  .total-val { font-size: 1.75rem; color: var(--primary); font-weight: 800; }

  .form-footer {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .btn-block { width: 100%; justify-content: center; height: 48px; font-size: 0.95rem; }

  @media (max-width: 600px) {
    .form-grid { grid-template-columns: 1fr; }
    .span-2 { grid-column: 1; }
    .add-card { padding: 24px; }
  }

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(10, 11, 14, 0.8);
    backdrop-filter: blur(8px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .modal-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    width: 100%;
    max-width: 400px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    overflow: hidden;
  }

  .modal-header {
    padding: 20px 24px;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .modal-header h3 { margin: 0; font-size: 1.1rem; color: #fff; }
  .close-btn { 
    background: none; 
    border: none; 
    color: var(--text-dim); 
    font-size: 1.5rem; 
    cursor: pointer; 
    line-height: 1;
    padding: 0 4px;
    transition: color 0.2s;
  }
  .close-btn:hover { color: #fff; }

  .modal-body { padding: 24px; }
  .modal-desc { font-size: 0.9rem; color: var(--text-dim); margin-bottom: 24px; line-height: 1.5; }

  .test-input-group { margin-bottom: 24px; }
  .test-input-group input {
    width: 100%;
    background: var(--surface-2);
    border: 1px solid var(--border);
    padding: 12px 16px;
    border-radius: var(--radius-sm);
    color: #fff;
    font-size: 1rem;
    outline: none;
    transition: all 0.2s;
  }
  .test-input-group input:focus { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2); }
  .test-error { color: #ef4444; font-size: 0.75rem; font-weight: 600; margin-top: 8px; display: block; }
</style>
