'use client';

import { useCallback, useEffect, useState } from 'react';

export function usePackages() {
  const [dependencies, setDependencies] = useState({});
  const [devDependencies, setDevDependencies] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/packages');
      const data = await res.json();
      if (data.ok) {
        setDependencies(data.dependencies || {});
        setDevDependencies(data.devDependencies || {});
      } else {
        setError(data.error || 'Failed to load packages');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { dependencies, setDependencies, devDependencies, setDevDependencies, error, loading, refresh };
}
