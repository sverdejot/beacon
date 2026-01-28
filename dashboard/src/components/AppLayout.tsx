import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardProvider, useDashboard } from '../context/DashboardContext';
import { TimeRangeSelector } from './TimeRangeSelector';
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
  const { timeRange, setTimeRange, sidebarOpen, toggleSidebar, setSidebarOpen } = useDashboard();
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
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
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
          <div>{t('sidebar.trafficData')}</div>
          <div className="sidebar-footer-sub">{t('sidebar.dgtApi')}</div>
        </div>
        <a href={toggleHref} className="lang-toggle" aria-label={`Switch to ${targetLang === 'en' ? 'English' : 'Español'}`}>
          <span className={`lang-option ${currentLang === 'es' ? 'active' : ''}`}>ES</span>
          <span className={`lang-option ${currentLang === 'en' ? 'active' : ''}`}>EN</span>
        </a>
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
