import { useState, useEffect } from 'react';

export function useNetworkStatus(): { isOnline: boolean } {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    async function check() {
      try {
        const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${backendUrl}/health`, { signal: controller.signal });
        clearTimeout(timeout);
        setIsOnline(res.ok);
      } catch {
        setIsOnline(false);
      }
    }

    check();
    interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  return { isOnline };
}
