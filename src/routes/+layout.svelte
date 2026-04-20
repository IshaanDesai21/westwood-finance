<script>
  import { onMount } from 'svelte';
  import { dataService } from '$lib/dataService.svelte.js';
  import '../app.css';
  import Sidebar from '$lib/components/Sidebar.svelte';

  let { children } = $props();

  onMount(() => {
    // Poll the backend every 3000ms (3 seconds) globally to ensure fast updates.
    const interval = setInterval(() => {
      // force=true to bypass regular 2-minute cache rule in dataService
      // silent=true to prevent UI loading indicators/animations
      dataService.load(true, true);
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  });
</script>

<svelte:head>
  <title>Westwood Finance</title>
  <meta name="description" content="Finance management system for Westwood Robotics" />
</svelte:head>

<div class="app-shell">
  <Sidebar />
  <main class="main-content">
    {@render children()}
  </main>
</div>
