import { useDashboard, type Filter } from '../context/DashboardContext';

export function ActiveFilters() {
  const { filters, removeFilter, clearFilters } = useDashboard();

  if (filters.length === 0) {
    return null;
  }

  return (
    <div className="active-filters" role="region" aria-label="Active filters">
      <span className="active-filters-label">Filtering by:</span>
      {filters.map((filter) => (
        <FilterChip
          key={`${filter.type}-${filter.value}`}
          filter={filter}
          onRemove={() => removeFilter(filter)}
        />
      ))}
      <button
        className="clear-filters-btn"
        onClick={clearFilters}
        aria-label="Clear all filters"
      >
        Clear all
      </button>
    </div>
  );
}

interface FilterChipProps {
  filter: Filter;
  onRemove: () => void;
}

function FilterChip({ filter, onRemove }: FilterChipProps) {
  return (
    <span className="filter-chip">
      <span className="filter-chip-type">{filter.type}:</span>
      <span className="filter-chip-value">{filter.label}</span>
      <button
        className="filter-chip-remove"
        onClick={onRemove}
        aria-label={`Remove ${filter.type} filter: ${filter.label}`}
      >
        ×
      </button>
    </span>
  );
}
