import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface Filter {
  type: 'province' | 'severity' | 'cause' | 'road';
  value: string;
  label: string;
}

interface DashboardContextType {
  // Filters
  filters: Filter[];
  addFilter: (filter: Filter) => void;
  removeFilter: (filter: Filter) => void;
  clearFilters: () => void;
  hasFilter: (type: Filter['type'], value: string) => boolean;
  
  // Sidebar state (for mobile)
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

interface DashboardProviderProps {
  children: ReactNode;
}

export function DashboardProvider({ children }: DashboardProviderProps) {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const addFilter = useCallback((filter: Filter) => {
    setFilters((prev) => {
      // Don't add duplicate filters
      const exists = prev.some(
        (f) => f.type === filter.type && f.value === filter.value
      );
      if (exists) return prev;
      return [...prev, filter];
    });
  }, []);

  const removeFilter = useCallback((filter: Filter) => {
    setFilters((prev) =>
      prev.filter((f) => !(f.type === filter.type && f.value === filter.value))
    );
  }, []);

  const clearFilters = useCallback(() => {
    setFilters([]);
  }, []);

  const hasFilter = useCallback(
    (type: Filter['type'], value: string) => {
      return filters.some((f) => f.type === type && f.value === value);
    },
    [filters]
  );

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  return (
    <DashboardContext.Provider
      value={{
        filters,
        addFilter,
        removeFilter,
        clearFilters,
        hasFilter,
        sidebarOpen,
        setSidebarOpen,
        toggleSidebar,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
