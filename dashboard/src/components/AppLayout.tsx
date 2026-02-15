import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardProvider, useDashboard } from '../context/DashboardContext';
import { ConnectionStatus } from './ConnectionStatus';
import { ActiveFilters } from './ActiveFilters';
import { useSSE } from '../hooks/useSSE';
import { initI18n, type SupportedLang } from '../i18n';

function getLocalizedPathFromCurrent(currentPath: string, targetLang: SupportedLang): string {
  // Strip current language prefix if present
  let basePath = currentPath;
  if (basePath.startsWith('/en/')) {
    basePath = basePath.slice(3);
  } else if (basePath === '/en') {
    basePath = '/';
  }

  // Add target language prefix
  if (targetLang === 'en') {
    return basePath === '/' ? '/en/' : `/en${basePath}`;
  }
  return basePath || '/';
}

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  currentPath: string;
  lang?: SupportedLang;
}

function AppLayoutInner({ children, title, currentPath }: AppLayoutProps) {
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useDashboard();
  const sse = useSSE();

  return (
    <div className="app-layout">
      {/* Mobile backdrop */}
      <div
        className={`sidebar-backdrop ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <SidebarContent currentPath={currentPath} />
      </aside>

      {/* Main content */}
      <main className="app-main">
        {/* Header */}
        <header className="content-header">
          <div className="content-header-left">
            <button
              className="mobile-menu-btn"
              onClick={toggleSidebar}
              aria-label="Toggle menu"
              aria-expanded={sidebarOpen}
            >
              ☰
            </button>
            <h1 className="page-title">{title}</h1>
          </div>
          <div className="content-header-right">
            <ConnectionStatus connected={sse.connected} />
          </div>
        </header>

        {/* Active filters */}
        <div className="dashboard">
          <ActiveFilters />
          {children}
        </div>
      </main>
    </div>
  );
}

function SidebarContent({ currentPath }: { currentPath: string }) {
  const { t } = useTranslation();

  const langPrefix = currentPath.startsWith('/en/') || currentPath === '/en' ? '/en' : '';

  const navigation = [
    {
      title: t('nav.main'),
      items: [
        { id: 'overview', label: t('nav.overview'), icon: '📊', href: `${langPrefix}/` },
        { id: 'map', label: t('nav.liveMap'), icon: '🗺️', href: `${langPrefix}/map` },
      ],
    },
    {
      title: t('nav.analytics'),
      items: [
        { id: 'trends', label: t('nav.trends'), icon: '📈', href: `${langPrefix}/trends` },
        { id: 'distribution', label: t('nav.distribution'), icon: '📉', href: `${langPrefix}/distribution` },
        { id: 'heatmap', label: t('nav.heatmap'), icon: '🔥', href: `${langPrefix}/heatmap` },
      ],
    },
    {
      title: t('nav.data'),
      items: [
        { id: 'incidents', label: t('nav.activeIncidents'), icon: '🚨', href: `${langPrefix}/incidents` },
        { id: 'roads', label: t('nav.topRoads'), icon: '🛣️', href: `${langPrefix}/roads` },
      ],
    },
  ];

  const normalizePath = (path: string) => path.replace(/\/$/, '') || '/';
  const isActive = (href: string) => normalizePath(currentPath) === normalizePath(href);

  const currentLang: SupportedLang = langPrefix ? 'en' : 'es';
  const targetLang: SupportedLang = currentLang === 'es' ? 'en' : 'es';
  const toggleHref = getLocalizedPathFromCurrent(currentPath, targetLang);

  return (
    <>
      <div className="sidebar-header">
        <div className="sidebar-logo" aria-hidden="true">
          🚦
        </div>
        <span className="sidebar-title">Beacon</span>
      </div>

      <nav className="sidebar-nav">
        {navigation.map((section) => (
          <div key={section.title} className="sidebar-section">
            <div className="sidebar-section-title">{section.title}</div>
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

      <div className="sidebar-footer">
        <div className="sidebar-footer-info">
          <a href="https://github.com/sverdejot" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="GitHub">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
          </a>
          <a href="https://linkedin.com/in/sverdejot" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="LinkedIn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          </a>
        </div>
        <a href={toggleHref} className="lang-toggle" aria-label={`Switch to ${targetLang === 'en' ? 'English' : 'Español'}`}>
          <span className={`lang-option ${currentLang === 'es' ? 'active' : ''}`}>ES</span>
          <span className={`lang-option ${currentLang === 'en' ? 'active' : ''}`}>EN</span>
        </a>
        <span className="sidebar-made-by">made by <a href="https://github.com/sverdejot" target="_blank" rel="noopener noreferrer">@sverdejot</a></span>
      </div>
    </>
  );
}

export function AppLayout(props: AppLayoutProps) {
  initI18n(props.lang);
  return (
    <DashboardProvider>
      <AppLayoutInner {...props} />
    </DashboardProvider>
  );
}
