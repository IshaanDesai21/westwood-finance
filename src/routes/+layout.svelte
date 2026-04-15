<script>
  import { onMount } from 'svelte';
  import { dataService } from '$lib/dataService.svelte.js';
  import '../app.css';
  import Sidebar from '$lib/components/Sidebar.svelte';

  let { children } = $props();

  onMount(() => {
    let lastActive = Date.now();
    
    function markActive() {
      lastActive = Date.now();
    }

    // List of events to consider as "activity"
    window.addEventListener('mousemove', markActive);
    window.addEventListener('keydown', markActive);
    window.addEventListener('click', markActive);
    window.addEventListener('scroll', markActive);

    const interval = setInterval(() => {
      const now = Date.now();
      const inactiveTime = now - lastActive;
      
      // If inactive for more than 10 seconds, and we haven't fetched in the last 10 seconds
      if (inactiveTime > 10000 && (!dataService.lastFetched || (now - dataService.lastFetched) > 10000)) {
        // Trigger a background sync
        // force=true to bypass regular 2-minute cache rule in dataService
        dataService.load(true);
      }
    }, 5000); // Check every 5 seconds

    return () => {
      window.removeEventListener('mousemove', markActive);
      window.removeEventListener('keydown', markActive);
      window.removeEventListener('click', markActive);
      window.removeEventListener('scroll', markActive);
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
