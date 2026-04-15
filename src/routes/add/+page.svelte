<script>
  import { CATEGORIES, TEAMS } from "$lib/utils.js";
  import { goto } from "$app/navigation";
  import CustomDropdown from "$lib/components/CustomDropdown.svelte";
  import { dataService } from "$lib/dataService.svelte.js";

  const teamOptions = TEAMS.map((/** @type {string} */ team) => ({
    label: team,
    value: team,
  }));

  const API_URL =
    "https://script.google.com/macros/s/AKfycbyRS5lB5Sf2degy9QY8mzmT9A_DEbnF-7eSLSJJvb6JkR4vu0jI_b-1IxPgiOJDvU79pw/exec";

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
    isExpense: false, // Tracks if adding as immediate expense
  });

  let submitting = $state(false);
  let submitError = $state("");
  let submitSuccess = $state("");
  let expenseUnlocked = $state(false);

  let computedTotal = $derived(
    (parseFloat(form.price) || 0) * (parseInt(form.quantity) || 1),
  );

  async function submit() {
    submitError = "";
    submitSuccess = "";

    if (!form.item.trim()) {
      submitError = "Item name is required.";
      return;
    }

    if (!form.price || isNaN(parseFloat(form.price))) {
      submitError = "Valid price is required.";
      return;
    }

    submitting = true;

    try {
      // ✅ Link Auto-Fix: Prepend https:// if missing
      let finalLink = form.link.trim();
      if (finalLink && !finalLink.startsWith("http") && finalLink.includes(".")) {
        finalLink = "https://" + finalLink;
      }

      // ✅ FIX: force all values to strings for URLSearchParams
      const params = new URLSearchParams({
        action: "addOrder",
        key: "YOUR_SECRET_KEY",
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
      });

      const url = `${API_URL}?${params.toString()}`;

      const response = await fetch(url);
      const result = await response.json();

      console.log("API result:", result);

      if (!response.ok || result.error) {
        throw new Error(result.error || "Request failed");
      }

      submitSuccess = "✓ Order successfully sent!";
      
      // Force refresh so that the cache is updated when they navigate back
      dataService.load(true);

      // reset form
      form = {
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
        isExpense: false,
      };

      setTimeout(() => goto("/orders"), 1500);
    } catch (e) {
      // ✅ FIX: proper error typing
      if (e instanceof Error) {
        submitError = e.message;
      } else {
        submitError = "Unknown error occurred";
      }
    } finally {
      submitting = false;
    }
  }
  function toggleExpenseMode() {
    if (form.isExpense) {
      form.isExpense = false;
      expenseUnlocked = false;
      return;
    }
    showExpenseModal = true;
  }

  let showExpenseModal = $state(false);
  let adminCodeInput = $state("");

  function confirmExpenseMode() {
    if (adminCodeInput === "/dev3432") {
      form.isExpense = true;
      expenseUnlocked = true;
      showExpenseModal = false;
      adminCodeInput = "";
    } else {
      alert("Incorrect admin code.");
    }
  }
</script>

<svelte:head>
  <title>Add Order — Westwood Finance</title>
</svelte:head>

<div class="page-header">
  <div style="display:flex; flex-direction:column; gap:4px">
    <h1>
      Add <span>{form.isExpense ? "Expense" : "Order"}</span>
    </h1>
    {#if form.isExpense}
      <span class="badge badge-received" style="width:fit-content; font-size:0.7rem">ADMIN MODE: IMMEDIATE EXPENSE</span>
    {/if}
  </div>
  <div style="display:flex; gap:10px; align-items:center">
    <button 
      class="btn btn-sm {form.isExpense ? 'btn-primary' : 'btn-ghost'}" 
      onclick={toggleExpenseMode}
    >
      {form.isExpense ? "✓ Expense Mode" : "Submit as Expense"}
    </button>
    <a href="/orders" class="btn btn-ghost btn-sm">← Back</a>
  </div>
</div>

  <div class="add-layout-wide">
    {#if showExpenseModal}
      <div class="modal-backdrop fade-in" style="z-index: 1000;">
        <div class="card modal-card" style="width: 320px; padding: 32px; text-align: center;">
          <div class="icon" style="font-size: 2.5rem; margin-bottom: 20px;">🛡️</div>
          <h3 style="margin-bottom: 12px;">Admin Access</h3>
          <p class="text-muted" style="font-size: 0.9rem; margin-bottom: 24px;">Enter the code to unlock immediate expense mode.</p>
          <div class="form-group" style="margin-bottom: 24px;">
            <input 
              type="password" 
              bind:value={adminCodeInput} 
              placeholder="Enter code" 
              style="text-align: center; font-size: 1.1rem; letter-spacing: 0.2em;"
              onkeydown={(e) => e.key === 'Enter' && confirmExpenseMode()}
            />
          </div>
          <div style="display: flex; gap: 12px;">
            <button class="btn btn-primary" style="flex: 1;" onclick={confirmExpenseMode}>Unlock</button>
            <button class="btn btn-ghost" style="flex: 1;" onclick={() => { showExpenseModal = false; adminCodeInput = ""; }}>Cancel</button>
          </div>
        </div>
      </div>
    {/if}

    <div class="card add-card" class:fade-in={!dataService.hasLoadedOnce}>
    {#if submitError}
      <div class="error-bar">{submitError}</div>
    {/if}
    {#if submitSuccess}
      <div class="success-bar">{submitSuccess}</div>
    {/if}

    <form
      onsubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      id="add-expense-form"
    >
      <div class="form-grid">
        <div class="form-group" style="grid-column:1/-1">
          <label for="ae-item">Item Name *</label>
          <input
            id="ae-item"
            type="text"
            bind:value={form.item}
            placeholder="e.g. REV Hub"
            required
          />
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
                onclick={() => (form.category = cat)}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            {/each}
          </div>
        </div>

        <div class="form-group">
          <label for="ae-company">Company</label>
          <input
            id="ae-company"
            type="text"
            bind:value={form.company}
            placeholder="e.g. REV Robotics"
          />
        </div>

        <div class="form-group" style="grid-column:1/-1">
          <label for="ae-link">Purchase Link</label>
          <input
            id="ae-link"
            type="url"
            bind:value={form.link}
            placeholder="https://…"
          />
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

        <div class="form-group">
          <label for="ae-team">Team *</label>
          <CustomDropdown
            options={teamOptions}
            bind:value={form.team}
            placeholder="Select your team"
          />
        </div>

        <div class="form-group" style="grid-column:1/-1">
          <label for="ae-uuid">Order ID / UUID (Optional)</label>
          <input
            id="ae-uuid"
            type="text"
            bind:value={form.uuid}
            placeholder="Leave blank to auto-generate…"
          />
        </div>

        <div class="form-group" style="grid-column:1/-1">
          <label for="ae-notes">Notes</label>
          <textarea
            id="ae-notes"
            bind:value={form.notes}
            placeholder="Any extra context…"
            rows="3"
          ></textarea>
        </div>
      </div>

      <div class="total-preview">
        <span class="text-muted">Computed Total</span>
        <strong class="total-val">${computedTotal.toFixed(2)}</strong>
      </div>

      <div style="margin-top:20px;display:flex;gap:10px">
        <button
          id="submit-expense-btn"
          type="submit"
          class="btn btn-primary"
          disabled={submitting}
        >
          {submitting
            ? "Saving…"
            : form.isExpense
              ? "+ Add Immediate Expense"
              : "+ Submit Order Request"}
        </button>
        <a href="/orders" class="btn btn-ghost">Cancel</a>
      </div>
    </form>
  </div>
</div>

<style>
  .add-layout-wide {
    max-width: 800px;
    margin: 0 auto;
  }

  .total-preview {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 12px 16px;
    margin-top: 16px;
  }
  .total-val {
    font-size: 1.4rem;
    color: var(--primary);
    letter-spacing: -0.5px;
  }

  .success-bar {
    background: rgba(107, 203, 119, 0.12);
    border: 1px solid rgba(107, 203, 119, 0.3);
    color: #6bcb77;
    padding: 10px 16px;
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
    margin-bottom: 16px;
  }
  .tips-card {
    padding: 20px;
  }
  .tips-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 10px;
  }

  .category-pills {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 4px;
  }
  .cat-pill {
    padding: 8px 16px;
    font-size: 0.85rem;
    font-weight: 600;
    border-radius: 99px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.2s;
  }
  .cat-pill:hover {
    background: var(--surface-2);
    color: var(--text);
  }
  .cat-pill.active {
    border-color: transparent;
    color: #fff;
    box-shadow: var(--shadow-sm);
  }
  .cat-pill.active.cat-hardware {
    background: var(--cat-hardware);
  }
  .cat-pill.active.cat-software {
    background: var(--cat-software);
  }
  .cat-pill.active.cat-outreach {
    background: var(--cat-outreach);
  }
  .cat-pill.active.cat-food {
    background: #f1a94e;
  }
  .cat-pill.active.cat-miscellaneous {
    background: var(--cat-miscellaneous);
  }

  .segmented-control {
    display: inline-flex;
    background: var(--surface-2);
    border-radius: 99px;
    padding: 4px;
    border: 1px solid var(--border);
  }
</style>
