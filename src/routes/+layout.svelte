<script lang="ts">
  import { onMount } from 'svelte';
  import { onNavigate } from '$app/navigation';
  import { dataService } from '$lib/dataService.svelte.js';
  import { authStore } from '$lib/authStore.svelte.js';
  import '../app.css';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import MobileTabBar from '$lib/components/MobileTabBar.svelte';
  import AuthGate from '$lib/components/AuthGate.svelte';
  import { demoStore } from '$lib/demo.svelte.js';

  let { children } = $props();

  // A direct hit on /demo must switch into the sandbox *before* AuthGate
  // evaluates, otherwise the visitor is bounced to the sign-in wall and the
  // demo page never gets to mount.
  if (typeof window !== 'undefined' && window.location.pathname.replace(/\/+$/, '') === '/demo') {
    authStore.enterDemo();
    // The data store's constructor may already have hydrated the real cached
    // dataset from localStorage; clear it so the demo can only ever show
    // fixtures.
    dataService.reset();
  }

  $effect(() => {
    if (authStore.isApproved && authStore.hasValidSession) dataService.load();
  });

  onMount(() => {
    const interval = setInterval(() => {
      if (authStore.isApproved && document.visibilityState === 'visible') {
        dataService.load(true, true);
      }
    }, 30000);
    return () => clearInterval(interval);
  });

  // ── iOS View Transitions (push slide) ──────────────────────────────────────
  onNavigate((navigation) => {
    // Only animate on mobile via View Transitions API
    if (!document.startViewTransition) return;
    if (window.innerWidth > 768) return;
    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });

  // ── Pull-to-Refresh ─────────────────────────────────────────────────────────
  let ptrActive = $state(false);
  let ptrTouchStartY = 0;
  const PTR_THRESHOLD = 64;

  onMount(() => {
    const main = document.querySelector('.main-content');
    if (!main) return;

    function onTouchStart(e) {
      if (window.innerWidth > 768) return;
      ptrTouchStartY = e.touches[0].clientY;
    }
 
    async function onTouchEnd(e) {
      if (window.innerWidth > 768 || dataService.isManualRefreshing) return;
      const delta = e.changedTouches[0].clientY - ptrTouchStartY;
      // Only fire if pulled down AND scroll is at top
      if (!main) return;
      const scrollTop = main.scrollTop ?? window.scrollY;
      if (delta > PTR_THRESHOLD && scrollTop <= 0) {
        if ('vibrate' in navigator) navigator.vibrate([8, 40, 8]);
        dataService.isManualRefreshing = true;
        try {
          await dataService.load(true);
        } finally {
          setTimeout(() => { dataService.isManualRefreshing = false; }, 600);
        }
      }
    }
 
    main.addEventListener('touchstart', onTouchStart, { passive: true });
    main.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      if (main) {
        main.removeEventListener('touchstart', onTouchStart);
        main.removeEventListener('touchend', onTouchEnd);
      }
    };
  });
</script>

<svelte:head>
  <title>Westwood Finance</title>
  <meta name="description" content="Finance management system for Westwood Robotics" />
</svelte:head>

<AuthGate>
  {#snippet children()}
    <a href="#main-content" class="skip-to-main">Skip to main content</a>

    <!-- Pull-to-Refresh Indicator -->
    {#if dataService.isManualRefreshing}
      <div class="ptr-indicator">
        <div class="ptr-spinner"></div>
        Refreshing…
      </div>
    {/if}

    <div class="app-shell">
      <Sidebar />
      <main id="main-content" class="main-content">
        {@render children()}
      </main>
    </div>

    <!-- iOS Tab Bar (renders itself only on mobile) -->
    <MobileTabBar />

    {#if demoStore.active}
      <div class="demo-badge">
        <span class="demo-badge-dot"></span>
        <span class="demo-badge-text">Demo &middot; sample data</span>
        <button
          class="demo-badge-exit"
          onclick={() => authStore.signOut()}
          aria-label="Exit demo mode"
        >Exit</button>
      </div>
    {/if}
  {/snippet}
</AuthGate>

<style>
  .demo-badge {
    position: fixed;
    top: 12px;
    right: 12px;
    z-index: 900;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px 6px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: #fde68a;
    background: rgba(30, 25, 10, 0.92);
    border: 1px solid rgba(251, 191, 36, 0.35);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(8px);
    pointer-events: auto;
  }

  .demo-badge-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #fbbf24;
    flex-shrink: 0;
  }

  .demo-badge-exit {
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    color: #fde68a;
    background: rgba(251, 191, 36, 0.14);
    border: 1px solid rgba(251, 191, 36, 0.3);
    cursor: pointer;
  }

  .demo-badge-exit:hover {
    background: rgba(251, 191, 36, 0.26);
  }

  @media (max-width: 768px) {
    .demo-badge {
      top: auto;
      bottom: calc(env(safe-area-inset-bottom, 0px) + 76px);
      right: 10px;
      font-size: 11px;
      padding: 5px 6px 5px 10px;
    }

    .demo-badge-text {
      display: none;
    }
  }
</style>
