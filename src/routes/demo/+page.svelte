<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '$lib/authStore.svelte.js';
  import { demoStore } from '$lib/demo.svelte.js';

  // The layout enters demo mode on a direct hit to /demo before AuthGate runs.
  // This covers client-side navigation into the route, then hands off to the
  // dashboard so the visitor lands on the real app rather than a splash.
  //
  // Deliberately a full-page navigation rather than goto(): a client-side
  // navigation issued from onMount during initial hydration races the router
  // and gets swallowed, stranding the visitor on this splash. The demo flag
  // lives in sessionStorage, so it survives the reload and authStore's
  // constructor re-enters demo mode on the way back up.
  onMount(() => {
    if (!demoStore.active || authStore.status !== 'approved') {
      authStore.enterDemo();
    }
    window.location.replace('/');
  });
</script>

<svelte:head>
  <title>Westwood Finance — Demo</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="demo-boot" role="status" aria-live="polite">
  <div class="demo-boot-spinner"></div>
  <p>Loading demo…</p>
</div>

<style>
  .demo-boot {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    min-height: 60vh;
    color: var(--text-muted);
  }

  .demo-boot-spinner {
    width: 28px;
    height: 28px;
    border: 2px solid var(--border);
    border-top-color: var(--accent, #6366f1);
    border-radius: 50%;
    animation: demo-spin 0.7s linear infinite;
  }

  @keyframes demo-spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
