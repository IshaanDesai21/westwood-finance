<script>
  import '../app.css';
  import Sidebar from '$lib/components/Sidebar.svelte';

  let { children } = $props();
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
