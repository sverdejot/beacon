interface ConnectionStatusProps {
  connected: boolean;
}

export function ConnectionStatus({ connected }: ConnectionStatusProps) {
  return (
    <div
      className={`connection-status ${connected ? 'connected' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="dot" aria-hidden="true" />
      <span>{connected ? 'Live' : 'Connecting...'}</span>
    </div>
  );
}
