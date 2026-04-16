<script>
  import { page } from "$app/stores";

  const navItems = [
    { href: "/", label: "Dashboard", icon: "◈" },
    { href: "/funding/", label: "Team Dashboard", icon: "◆" },
    { href: "/orders/", label: "Orders", icon: "☷" },
    { href: "/add/", label: "Add Expense", icon: "+" },
    { href: "/stats/", label: "Analytics", icon: "◎" },
    { href: "/admin/", label: "Admin Console", icon: "⚙" },
  ];
</script>

<aside class="sidebar">
  <div class="sidebar-brand">
    <div class="logo-wrapper">
      <img src="/logo-bordered.png" alt="Westwood Logo" class="logo-actual" />
    </div>
    <div class="brand-text">
       <span class="brand-title">WESTWOOD</span>
       <span class="brand-module">FINANCE</span>
    </div>
  </div>

  <nav class="sidebar-nav">
    {#each navItems as item}
      <a
        href={item.href}
        class="nav-link"
        class:active={$page.url.pathname.replace(/\/$/, '') === item.href.replace(/\/$/, '')}
        aria-current={$page.url.pathname.replace(/\/$/, '') === item.href.replace(/\/$/, '') ? "page" : undefined}
      >
        <span class="nav-icon">{item.icon}</span>
        <span>{item.label}</span>
      </a>
    {/each}
  </nav>

  <div class="sidebar-footer">
    <span class="text-muted" style="font-size:0.75rem"
      >Westwood Robotics © 2025</span
    >
  </div>
</aside>

<style>
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: var(--sidebar-width);
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    padding: 20px 0;
    z-index: 100;
  }

  .sidebar-brand {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 24px 20px;
    margin-bottom: 8px;
  }

  .logo-wrapper {
    position: relative;
    width: 48px;
    height: 48px;
    background: transparent;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .logo-actual {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    border: 1.5px solid rgba(255, 255, 255, 0.95);
    box-shadow: 0 0 8px rgba(255, 255, 255, 0.1);
  }

  .brand-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .brand-title {
    font-weight: 800;
    font-size: 1rem;
    letter-spacing: 0.12em;
    color: var(--text);
    line-height: 1;
  }

  .brand-module {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--primary);
    text-transform: uppercase;
    letter-spacing: 0.3em;
    opacity: 0.9;
  }

  .sidebar-nav {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0 10px;
    overflow-y: auto;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    font-size: 0.875rem;
    font-weight: 500;
    text-decoration: none;
    transition:
      background 0.15s,
      color 0.15s;
  }

  .nav-link:hover {
    background: var(--surface-2);
    color: var(--text);
    text-decoration: none;
  }

  .nav-link.active {
    background: var(--primary-glow);
    color: var(--primary);
  }

  .nav-icon {
    font-size: 1rem;
    width: 20px;
    text-align: center;
    flex-shrink: 0;
  }

  .sidebar-footer {
    padding: 16px 20px 0;
    border-top: 1px solid var(--border);
  }
</style>
