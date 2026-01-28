import { useTranslation } from 'react-i18next';

interface TimeRangeOption {
  label: string;
  value: string;
}

const options: TimeRangeOption[] = [
  { label: '1h', value: '1h' },
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
];

interface TimeRangeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="time-range-selector" role="group" aria-label={t('timeRange.label')}>
      {options.map((option) => (
        <button
          key={option.value}
          className={`time-range-btn ${value === option.value ? 'active' : ''}`}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
