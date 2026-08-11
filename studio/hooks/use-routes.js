'use client';

import { useCallback, useEffect, useState } from 'react';

export function useRoutes() {
  const [routes, setRoutes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/routes');
      const data = await res.json();
      setRoutes(data.routes || []);
      setJobs(data.jobs || []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { routes, jobs, error, loading, refresh };
}
