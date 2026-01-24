import { useState, useEffect, useCallback } from 'react';
import type { Summary } from '../lib/types';

export function useSSE() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(() => {
    const eventSource = new EventSource('/sse/dashboard');

    eventSource.onopen = () => {
      setConnected(true);
      setError(null);
    };

    eventSource.addEventListener('summary', (event) => {
      try {
        const data = JSON.parse(event.data) as Summary;
        setSummary(data);
      } catch (e) {
        console.error('Failed to parse SSE data:', e);
      }
    });

    eventSource.onerror = () => {
      setConnected(false);
      setError('Connection lost. Reconnecting...');
      eventSource.close();
      // Reconnect after 5 seconds
      setTimeout(connect, 5000);
    };

    return eventSource;
  }, []);

  useEffect(() => {
    const eventSource = connect();
    return () => eventSource.close();
  }, [connect]);

  return { summary, connected, error };
}
