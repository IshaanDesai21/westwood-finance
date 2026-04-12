<script>
  import { page } from '$app/stores';

  const navItems = [
    { href: '/',          label: 'Dashboard',  icon: '◈' },
    { href: '/expenses',  label: 'All Expenses', icon: '☰' },
    { href: '/add',       label: 'Add Expense', icon: '+' },
    { href: '/stats',     label: 'Analytics',  icon: '◎' },
    { href: '/funding',   label: 'Funding',    icon: '◆' },
  ];
</script>

<aside class="sidebar">
  <div class="sidebar-brand">
    <span class="brand-icon">W</span>
    <div>
      <div class="brand-name">Westwood</div>
      <div class="brand-sub">Finance</div>
    </div>
  </div>

  <nav class="sidebar-nav">
    {#each navItems as item}
      <a
        href={item.href}
        class="nav-link"
        class:active={$page.url.pathname === item.href}
        aria-current={$page.url.pathname === item.href ? 'page' : undefined}
      >
        <span class="nav-icon">{item.icon}</span>
        <span>{item.label}</span>
      </a>
    {/each}
  </nav>

  <div class="sidebar-footer">
    <span class="text-muted" style="font-size:0.75rem">Westwood Robotics © 2025</span>
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
    align-items: center;
    gap: 12px;
    padding: 0 20px 24px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 16px;
  }

  .brand-icon {
    width: 36px;
    height: 36px;
    background: var(--primary);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 1.1rem;
    color: #fff;
    flex-shrink: 0;
  }

  .brand-name {
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--text);
  }

  .brand-sub {
    font-size: 0.7rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .sidebar-nav {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0 10px;
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
    transition: background 0.15s, color 0.15s;
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
