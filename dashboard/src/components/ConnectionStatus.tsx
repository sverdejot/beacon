import { useTranslation } from 'react-i18next';

interface ConnectionStatusProps {
  connected: boolean;
}

export function ConnectionStatus({ connected }: ConnectionStatusProps) {
  const { t } = useTranslation();
  return (
    <div
      className={`connection-status ${connected ? 'connected' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="dot" aria-hidden="true" />
      <span>{connected ? t('connection.live') : t('connection.connecting')}</span>
    </div>
  );
}
