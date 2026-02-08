import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

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

function getNavigation(t: (key: string) => string): NavSection[] {
  return [
    {
      title: t('nav.main'),
      items: [
        { id: 'overview', label: t('nav.overview'), icon: '📊', href: '/dashboard/' },
        { id: 'map', label: t('nav.liveMap'), icon: '🗺️', href: '/dashboard/map' },
      ],
    },
    {
      title: t('nav.analytics'),
      items: [
        { id: 'trends', label: t('nav.trends'), icon: '📈', href: '/dashboard/trends' },
        { id: 'distribution', label: t('nav.distribution'), icon: '📉', href: '/dashboard/distribution' },
        { id: 'heatmap', label: t('nav.heatmap'), icon: '🔥', href: '/dashboard/heatmap' },
      ],
    },
    {
      title: t('nav.data'),
      items: [
        { id: 'incidents', label: t('nav.activeIncidents'), icon: '🚨', href: '/dashboard/incidents' },
        { id: 'roads', label: t('nav.topRoads'), icon: '🛣️', href: '/dashboard/roads' },
      ],
    },
  ];
}

interface SidebarProps {
  currentPath?: string;
}

export function Sidebar({ currentPath = '/dashboard/' }: SidebarProps) {
  const { t } = useTranslation();
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
          {getNavigation(t).map((section) => (
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
            <div className="sidebar-footer-info">
              <a href="https://github.com/sverdejot" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="GitHub">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
              </a>
              <a href="https://linkedin.com/in/sverdejot" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="LinkedIn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
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
