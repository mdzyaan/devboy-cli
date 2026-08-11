'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import PanelHeader from '@/components/dev/PanelHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { usePackages } from '@/hooks/use-packages';

export default function DevDepsPane({ collapsed, onToggle }) {
  const {
    dependencies,
    setDependencies,
    devDependencies,
    setDevDependencies,
    loading,
    refresh,
  } = usePackages();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setSearching(false);
      return undefined;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/packages/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (data.ok) setResults((data.objects || []).slice(0, 8));
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function install(name, version) {
    setBusy(true);
    try {
      const res = await fetch('/api/packages/install', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, version }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.error || 'Install failed');
        return;
      }
      setDependencies(data.dependencies || {});
      setDevDependencies(data.devDependencies || {});
      toast.success(`Installed ${name}`);
      setQuery('');
      setResults([]);
      await refresh();
    } catch (e) {
      toast.error(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(name) {
    if (!window.confirm(`Remove ${name}?`)) return;
    setBusy(true);
    try {
      const res = await fetch('/api/packages/remove', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.error || 'Remove failed');
        return;
      }
      setDependencies(data.dependencies || {});
      setDevDependencies(data.devDependencies || {});
      toast.success(`Removed ${name}`);
    } catch (e) {
      toast.error(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  const installed = [
    ...Object.entries(dependencies || {}).map(([name, version]) => ({
      name,
      version,
      kind: 'dep',
    })),
    ...Object.entries(devDependencies || {}).map(([name, version]) => ({
      name,
      version,
      kind: 'dev',
    })),
  ];

  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        title="Dependencies"
        subtitle={loading ? '…' : String(installed.length)}
        collapsed={collapsed}
        onToggle={onToggle}
      />
      {collapsed ? null : (
        <>
          <div className="border-b border-border p-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search & install…"
              className="h-7 text-xs"
              disabled={busy}
            />
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-2 p-2">
              {searching ? <Skeleton className="h-8 w-full" /> : null}
              {results.map((pkg) => (
                <div
                  key={pkg.name}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium">{pkg.name}</div>
                    <div className="truncate text-[10px] text-muted-foreground">v{pkg.version}</div>
                  </div>
                  <Button
                    type="button"
                    size="xs"
                    disabled={busy}
                    onClick={() => install(pkg.name, pkg.version)}
                  >
                    Install
                  </Button>
                </div>
              ))}

              <div className="pt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Installed ({loading ? '…' : installed.length})
              </div>
              {loading ? (
                <Skeleton className="h-8 w-full" />
              ) : installed.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No packages yet.</p>
              ) : (
                installed.map((pkg) => (
                  <div
                    key={`${pkg.kind}:${pkg.name}`}
                    className="flex items-center justify-between gap-2 rounded-md px-1 py-1"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-xs">{pkg.name}</div>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {pkg.version}
                        </span>
                        <Badge variant="outline" className="h-4 px-1 text-[9px]">
                          {pkg.kind}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => remove(pkg.name)}
                    >
                      Remove
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}
