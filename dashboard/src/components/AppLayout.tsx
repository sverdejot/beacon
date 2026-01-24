import { type ReactNode } from 'react';
import { DashboardProvider, useDashboard } from '../context/DashboardContext';
import { Sidebar } from './Sidebar';
import { TimeRangeSelector } from './TimeRangeSelector';
import { ConnectionStatus } from './ConnectionStatus';
import { ActiveFilters } from './ActiveFilters';
import { useSSE } from '../hooks/useSSE';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  currentPath: string;
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
  const navigation = [
    {
      title: 'Main',
      items: [
        { id: 'overview', label: 'Overview', icon: '📊', href: '/' },
        { id: 'map', label: 'Live Map', icon: '🗺️', href: '/map' },
      ],
    },
    {
      title: 'Analytics',
      items: [
        { id: 'trends', label: 'Trends', icon: '📈', href: '/trends' },
        { id: 'distribution', label: 'Distribution', icon: '📉', href: '/distribution' },
        { id: 'heatmap', label: 'Heatmap', icon: '🔥', href: '/heatmap' },
      ],
    },
    {
      title: 'Data',
      items: [
        { id: 'incidents', label: 'Active Incidents', icon: '🚨', href: '/incidents' },
        { id: 'roads', label: 'Top Roads', icon: '🛣️', href: '/roads' },
      ],
    },
  ];

  const normalizePath = (path: string) => path.replace(/\/$/, '') || '/';
  const isActive = (href: string) => normalizePath(currentPath) === normalizePath(href);

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
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          <div style={{ marginBottom: '0.25rem' }}>Spanish Traffic Data</div>
          <div style={{ opacity: 0.7 }}>DGT DATEX II API</div>
        </div>
      </div>
    </>
  );
}

export function AppLayout(props: AppLayoutProps) {
  return (
    <DashboardProvider>
      <AppLayoutInner {...props} />
    </DashboardProvider>
  );
}
