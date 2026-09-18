import { useEffect } from 'react';

export function GameViewTracker({ siteGameId }: { siteGameId: string }) {
  useEffect(() => {
    const controller = new AbortController();

    void fetch('/api/game-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteGameId }),
      signal: controller.signal,
      keepalive: true,
    }).catch(() => undefined);

    return () => controller.abort();
  }, [siteGameId]);

  return null;
}
