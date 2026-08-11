'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import CatalogList from '@/components/CatalogList';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { usePackages } from '@/hooks/use-packages';
import { useRoutes } from '@/hooks/use-routes';

function MetricCard({ title, value, hint, loading }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl font-semibold tracking-tight">
          {loading ? <Skeleton className="h-9 w-16" /> : value}
        </CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

export default function OverviewPanel({ catalog, config, setConfig, cwd }) {
  const [envVars, setEnvVars] = useState({});
  const [log, setLog] = useState('');
  const [busy, setBusy] = useState(false);
  const { routes, jobs, loading: routesLoading } = useRoutes();
  const { dependencies, loading: packagesLoading } = usePackages();

  const neededKeys = useMemo(() => {
    if (!catalog || !config) return [];
    const keys = new Set();
    const pick = (section, id) => (catalog[section] || []).find((x) => x.id === id);
    for (const k of pick('auth', config.auth.provider)?.envKeys || []) keys.add(k);
    for (const k of pick('db', config.db.provider)?.envKeys || []) keys.add(k);
    for (const k of pick('cron', config.cron.provider)?.envKeys || []) keys.add(k);
    return [...keys];
  }, [catalog, config]);

  const depCount = Object.keys(dependencies || {}).length;

  useEffect(() => {
    setLog('');
  }, [config?.compute?.provider, config?.auth?.provider, config?.db?.provider, config?.cron?.provider]);

  async function saveConfig() {
    setBusy(true);
    setLog('Saving config...');
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          compute: config.compute,
          auth: config.auth,
          db: config.db,
          cron: config.cron,
        }),
      });
      const data = await res.json();
      setConfig(data.config);
      setLog('Config saved to devboy.config.js');
      toast.success('Config saved');
    } catch (e) {
      setLog(String(e));
      toast.error('Failed to save config');
    } finally {
      setBusy(false);
    }
  }

  async function saveEnv() {
    setBusy(true);
    try {
      const vars = {};
      for (const key of neededKeys) {
        if (envVars[key]) vars[key] = envVars[key];
      }
      await fetch('/api/env', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ vars }),
      });
      setLog('Wrote secrets to .env.local');
      toast.success('Secrets saved');
    } catch (e) {
      setLog(String(e));
      toast.error('Failed to save secrets');
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    setBusy(true);
    setLog('Applying integration scaffolds...');
    try {
      await saveConfig();
      await saveEnv();
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          compute: config.compute.provider,
          region: config.compute.region,
          auth: config.auth.provider,
          db: config.db.provider,
          cron: config.cron.provider,
          skipInstall: false,
        }),
      });
      const data = await res.json();
      setConfig(data.config);
      setLog('Integrations applied.');
      toast.success('Integrations applied');
    } catch (e) {
      setLog(String(e));
      toast.error('Apply failed');
    } finally {
      setBusy(false);
    }
  }

  async function runDoctor() {
    setBusy(true);
    setLog('Running doctor...');
    try {
      const res = await fetch('/api/doctor', { method: 'POST' });
      const data = await res.json();
      setLog(
        Object.entries(data.results)
          .map(([k, v]) => `${v.ok ? 'OK' : 'FAIL'} ${k}: ${v.message}`)
          .join('\n')
      );
    } catch (e) {
      setLog(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function deploy() {
    if (!window.confirm('Deploy API to the selected compute provider?')) return;
    setBusy(true);
    setLog('Deploying...');
    try {
      const res = await fetch('/api/deploy', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setLog(`Deployed.\nURL: ${data.url}\nFunction: ${data.functionName}`);
        toast.success('Deployed');
      } else {
        setLog(`Deploy failed: ${data.error}`);
        toast.error('Deploy failed');
      }
    } catch (e) {
      setLog(String(e));
      toast.error('Deploy failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure compute and external integrations. Studio stays local — only your API deploys.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Routes"
          value={routes.length}
          hint={`${jobs.length} job${jobs.length === 1 ? '' : 's'}`}
          loading={routesLoading}
        />
        <MetricCard title="Jobs" value={jobs.length} hint="From config" loading={routesLoading} />
        <MetricCard
          title="Dependencies"
          value={depCount}
          hint="Installed packages"
          loading={packagesLoading}
        />
        <MetricCard
          title="Compute"
          value={config.compute.provider}
          hint={config.compute.region}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">auth: {config.auth.provider}</Badge>
        <Badge variant="secondary">db: {config.db.provider}</Badge>
        <Badge variant="secondary">cron: {config.cron.provider}</Badge>
        <Badge variant="outline" className="font-mono text-[10px]">
          {cwd}
        </Badge>
      </div>

      {config.compute.provider === 'aws' ? (
        <Alert>
          <AlertTitle>AWS tip</AlertTitle>
          <AlertDescription>
            Ensure AWS credentials are available locally before Deploy. New accounts need IAM permissions
            for Lambda and API Gateway.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Compute</CardTitle>
            <CardDescription>Where the API runs in production</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={config.compute.provider}
                onValueChange={(provider) => {
                  if (!provider) return;
                  setConfig({ ...config, compute: { ...config.compute, provider } });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {catalog.compute.map((item) => (
                    <SelectItem
                      key={item.id}
                      value={item.id}
                      disabled={item.status !== 'available'}
                    >
                      {item.name}
                      {item.status !== 'available' ? ' (soon)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">Region</Label>
              <Input
                id="region"
                value={config.compute.region}
                onChange={(e) =>
                  setConfig({ ...config, compute: { ...config.compute, region: e.target.value } })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Auth</CardTitle>
            <CardDescription>External identity provider</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={config.auth.provider}
                onValueChange={(provider) => {
                  if (!provider) return;
                  setConfig({ ...config, auth: { provider } });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {catalog.auth.map((item) => (
                    <SelectItem
                      key={item.id}
                      value={item.id}
                      disabled={item.status !== 'available'}
                    >
                      {item.name}
                      {item.status !== 'available' ? ' (soon)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <CatalogList items={catalog.auth} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Database</CardTitle>
            <CardDescription>Managed Postgres / document store</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={config.db.provider}
                onValueChange={(provider) => {
                  if (!provider) return;
                  setConfig({ ...config, db: { provider } });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {catalog.db.map((item) => (
                    <SelectItem
                      key={item.id}
                      value={item.id}
                      disabled={item.status !== 'available'}
                    >
                      {item.name}
                      {item.status !== 'available' ? ' (soon)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <CatalogList items={catalog.db} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cron</CardTitle>
            <CardDescription>Scheduled job runner</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={config.cron.provider}
                onValueChange={(provider) => {
                  if (!provider) return;
                  setConfig({ ...config, cron: { provider } });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {catalog.cron.map((item) => (
                    <SelectItem
                      key={item.id}
                      value={item.id}
                      disabled={item.status !== 'available'}
                    >
                      {item.name}
                      {item.status !== 'available' ? ' (soon)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <CatalogList items={catalog.cron} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Secrets</CardTitle>
            <CardDescription>Written to .env.local (never committed)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {neededKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No secrets required for the current selection.
              </p>
            ) : (
              neededKeys.map((key) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{key}</Label>
                  <Input
                    id={key}
                    type="password"
                    autoComplete="off"
                    placeholder={`Paste ${key}`}
                    value={envVars[key] || ''}
                    onChange={(e) => setEnvVars({ ...envVars, [key]: e.target.value })}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Save, scaffold, verify, deploy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={busy} onClick={saveConfig}>
                Save config
              </Button>
              <Button type="button" variant="outline" disabled={busy} onClick={saveEnv}>
                Save secrets
              </Button>
              <Button type="button" disabled={busy} onClick={apply}>
                Apply integrations
              </Button>
              <Button type="button" variant="secondary" disabled={busy} onClick={runDoctor}>
                Doctor
              </Button>
              <Button type="button" disabled={busy} onClick={deploy}>
                Deploy API
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-muted/40">
        <CardHeader>
          <CardTitle className="text-base">Activity log</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="min-h-16 whitespace-pre-wrap font-mono text-xs text-muted-foreground">
            {log || 'No activity yet.'}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
