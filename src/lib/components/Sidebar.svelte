<script>
  import { page } from "$app/stores";

  const navItems = [
    { 
      href: "/", 
      label: "Dashboard", 
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>`
    },
    { 
      href: "/add/", 
      label: "Add Expense", 
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`
    },
    { 
      href: "/funding/", 
      label: "Team Dashboard", 
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
    },
    { 
      href: "/orders/", 
      label: "Orders", 
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`
    },
    { 
      href: "/stats/", 
      label: "Analytics", 
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`
    },
    { 
      href: "/admin/", 
      label: "Admin Portal", 
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`
    },
  ];

  /** @param {string} href */
  function isActive(href) {
    const current = $page.url.pathname.replace(/\/$/, '') || '/';
    const target = href.replace(/\/$/, '') || '/';
    return current === target;
  }
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
        class:active={isActive(item.href)}
        aria-current={isActive(item.href) ? "page" : undefined}
      >
        <span class="nav-icon">{@html item.icon}</span>
        <span>{item.label}</span>
      </a>
    {/each}
  </nav>

  <div class="sidebar-footer">
    <div class="footer-team">FTC Robotics #17576</div>
    <div class="footer-copyright">Westwood Robotics © 2025</div>
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
    z-index: 100;
  }

  .sidebar-brand {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 32px 24px;
    margin-bottom: 8px;
  }

  .logo-wrapper {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
  }

  .logo-actual {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
  }

  .brand-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .brand-title {
    font-weight: 800;
    font-size: 0.95rem;
    letter-spacing: 0.1em;
    color: #fff;
    line-height: 1;
  }

  .brand-module {
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--primary);
    text-transform: uppercase;
    letter-spacing: 0.25em;
    opacity: 0.8;
  }

  .sidebar-nav {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 0 14px;
    overflow-y: auto;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    font-size: 0.875rem;
    font-weight: 500;
    text-decoration: none;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
  }

  .nav-link:hover {
    background: var(--surface-2);
    color: var(--text);
  }

  .nav-link.active {
    background: var(--surface-3);
    color: #fff;
    font-weight: 600;
    box-shadow: var(--shadow-sm);
  }
  
  .nav-link.active::before {
    content: '';
    position: absolute;
    left: 4px;
    top: 8px;
    bottom: 8px;
    width: 2px;
    background: var(--primary);
    border-radius: 99px;
  }

  .nav-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    flex-shrink: 0;
    opacity: 0.7;
    transition: opacity 0.2s;
  }
  
  .nav-link:hover .nav-icon,
  .nav-link.active .nav-icon {
    opacity: 1;
  }

  .sidebar-footer {
    padding: 20px 24px;
    border-top: 1px solid var(--border);
    background: rgba(0,0,0,0.1);
  }
  
  .footer-team {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-muted);
    margin-bottom: 4px;
  }
  
  .footer-copyright {
    font-size: 0.65rem;
    color: var(--text-dim);
  }
</style>
