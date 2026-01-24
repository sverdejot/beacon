import { useState, useEffect } from 'react';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    title: 'Main',
    items: [
      { id: 'overview', label: 'Overview', icon: '📊', href: '/dashboard/' },
      { id: 'map', label: 'Live Map', icon: '🗺️', href: '/dashboard/map' },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { id: 'trends', label: 'Trends', icon: '📈', href: '/dashboard/trends' },
      { id: 'distribution', label: 'Distribution', icon: '📉', href: '/dashboard/distribution' },
      { id: 'heatmap', label: 'Heatmap', icon: '🔥', href: '/dashboard/heatmap' },
    ],
  },
  {
    title: 'Data',
    items: [
      { id: 'incidents', label: 'Active Incidents', icon: '🚨', href: '/dashboard/incidents' },
      { id: 'roads', label: 'Top Roads', icon: '🛣️', href: '/dashboard/roads' },
    ],
  },
];

interface SidebarProps {
  currentPath?: string;
}

export function Sidebar({ currentPath = '/dashboard/' }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved) {
      setCollapsed(JSON.parse(saved));
    }
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
  };

  // Close mobile menu on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
      }
    };

    // Keyboard shortcut for collapse (Cmd/Ctrl + B)
    const handleShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggleCollapsed();
      }
    };

    window.addEventListener('keydown', handleEscape);
    window.addEventListener('keydown', handleShortcut);
    return () => {
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('keydown', handleShortcut);
    };
  }, []);

  // Normalize paths for comparison
  const normalizePath = (path: string) => {
    return path.replace(/\/$/, '') || '/dashboard';
  };

  const isActive = (href: string) => {
    const normalizedCurrent = normalizePath(currentPath);
    const normalizedHref = normalizePath(href);
    return normalizedCurrent === normalizedHref;
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`sidebar-backdrop ${mobileOpen ? 'visible' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo" aria-hidden="true">
            🚦
          </div>
          <span className="sidebar-title">Beacon</span>
          <button
            className="sidebar-toggle"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            data-tooltip={collapsed ? 'Expand (⌘B)' : 'Collapse (⌘B)'}
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navigation.map((section) => (
            <div key={section.title} className="sidebar-section">
              <div className="sidebar-section-title">
                {collapsed ? '•••' : section.title}
              </div>
              {section.items.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  className={`sidebar-nav-item ${isActive(item.href) ? 'active' : ''}`}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                >
                  <span className="sidebar-nav-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="sidebar-nav-label">{item.label}</span>
                </a>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {!collapsed && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              <div style={{ marginBottom: '0.25rem' }}>Spanish Traffic Data</div>
              <div style={{ opacity: 0.7 }}>DGT DATEX II API</div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile menu button - rendered via prop */}
    </>
  );
}

// Export a hook for mobile menu control
export function useMobileMenu() {
  const [open, setOpen] = useState(false);
  
  const toggle = () => setOpen(!open);
  const close = () => setOpen(false);
  
  return { open, toggle, close };
}
