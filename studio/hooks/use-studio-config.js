'use client';

import { useCallback, useEffect, useState } from 'react';

export function useStudioConfig() {
  const [catalog, setCatalog] = useState(null);
  const [config, setConfig] = useState(null);
  const [cwd, setCwd] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [cRes, cfgRes] = await Promise.all([fetch('/api/catalog'), fetch('/api/config')]);
      const c = await cRes.json();
      const cfg = await cfgRes.json();
      setCatalog(c);
      setConfig(cfg.config);
      setCwd(cfg.cwd || '');
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { catalog, config, setConfig, cwd, error, loading, refresh };
}
