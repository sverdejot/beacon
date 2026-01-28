import { useTranslation } from 'react-i18next';
import { useDashboard, type Filter } from '../context/DashboardContext';

export function ActiveFilters() {
  const { t } = useTranslation();
  const { filters, removeFilter, clearFilters } = useDashboard();

  if (filters.length === 0) {
    return null;
  }

  return (
    <div className="active-filters" role="region" aria-label="Active filters">
      <span className="active-filters-label">{t('filters.filteringBy')}</span>
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
        aria-label={t('filters.clearAll')}
      >
        {t('filters.clearAll')}
      </button>
    </div>
  );
}

interface FilterChipProps {
  filter: Filter;
  onRemove: () => void;
}

function FilterChip({ filter, onRemove }: FilterChipProps) {
  const { t } = useTranslation();
  return (
    <span className="filter-chip">
      <span className="filter-chip-type">{filter.type}:</span>
      <span className="filter-chip-value">{filter.label}</span>
      <button
        className="filter-chip-remove"
        onClick={onRemove}
        aria-label={t('filters.removeFilter', { type: filter.type, label: filter.label })}
      >
        ×
      </button>
    </span>
  );
}
