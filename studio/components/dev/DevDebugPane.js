'use client';

import { CopyIcon, PlayIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import PanelHeader from '@/components/dev/PanelHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

function formatJson(value) {
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return String(value);
  }
}

function parseJsonObject(text, label) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return {};
  const parsed = JSON.parse(trimmed);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return parsed;
}

function formatBytes(n) {
  if (n == null) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DevDebugPane({ route, onLog, onCollapse }) {
  const [paramsText, setParamsText] = useState('{\n  \n}');
  const [headersText, setHeadersText] = useState('{\n  \n}');
  const [requestTab, setRequestTab] = useState('params');
  const [responseTab, setResponseTab] = useState('body');
  const [busy, setBusy] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setResponse(null);
    setError('');
  }, [route?.method, route?.path]);

  async function runDebug() {
    if (!route) {
      toast.error('Open a route handler file first');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const params = parseJsonObject(paramsText, 'Params');
      const headers = parseJsonObject(headersText, 'Headers');
      onLog?.(`Debug ${route.method} ${route.path}`);
      onLog?.(`params: ${JSON.stringify(params)}`);
      const res = await fetch('/api/debug/invoke', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          method: route.method,
          path: route.path,
          params,
          headers,
        }),
      });
      const data = await res.json();
      const handlerLogs = Array.isArray(data.logs) ? data.logs : [];
      for (const entry of handlerLogs) {
        const prefix = entry.level && entry.level !== 'log' ? `[${entry.level}] ` : '';
        onLog?.(`${prefix}${entry.message}`);
      }
      if (!data.ok) {
        setError(data.error || 'Invoke failed');
        setResponse(null);
        onLog?.(`error: ${data.error || 'Invoke failed'}`);
        toast.error('Debug failed');
        return;
      }
      setResponse(data);
      setResponseTab('body');
      onLog?.(`→ ${data.statusCode} · ${data.durationMs} ms · ${formatBytes(data.bytes)}`);
    } catch (e) {
      const message = String(e.message || e);
      setError(message);
      setResponse(null);
      onLog?.(`error: ${message}`);
      toast.error('Debug failed');
    } finally {
      setBusy(false);
    }
  }

  async function copyResponse() {
    if (!response) return;
    try {
      await navigator.clipboard.writeText(formatJson(response.body));
      toast.success('Copied response');
    } catch {
      toast.error('Copy failed');
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader
        title="Debug"
        subtitle={route ? `${route.method} ${route.path}` : 'No route'}
        onToggle={onCollapse}
        collapsed={false}
        actions={
          <Button type="button" size="sm" disabled={busy || !route} onClick={runDebug}>
            <PlayIcon data-icon="inline-start" />
            Debug
          </Button>
        }
      />

      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
        <Tabs value={requestTab} onValueChange={setRequestTab}>
          <TabsList variant="line">
            <TabsTrigger value="params">Params</TabsTrigger>
            <TabsTrigger value="headers">Headers</TabsTrigger>
          </TabsList>
          <TabsContent value="params" className="mt-2">
            <Textarea
              value={paramsText}
              onChange={(e) => setParamsText(e.target.value)}
              className="min-h-28 font-mono text-xs"
              spellCheck={false}
            />
          </TabsContent>
          <TabsContent value="headers" className="mt-2">
            <Textarea
              value={headersText}
              onChange={(e) => setHeadersText(e.target.value)}
              className="min-h-28 font-mono text-xs"
              spellCheck={false}
            />
          </TabsContent>
        </Tabs>

        <div className="space-y-2 border-t border-border pt-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium">Response</span>
            {response ? (
              <div className="flex flex-wrap items-center gap-1">
                <Badge variant="secondary">{response.statusCode}</Badge>
                <Badge variant="outline">{response.durationMs} ms</Badge>
                <Badge variant="outline">{formatBytes(response.bytes)}</Badge>
                <Button type="button" size="icon-xs" variant="ghost" onClick={copyResponse}>
                  <CopyIcon />
                </Button>
              </div>
            ) : null}
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          {!response && !error ? (
            <p className="text-xs text-muted-foreground">Run Debug to see a response.</p>
          ) : null}

          {response ? (
            <Tabs value={responseTab} onValueChange={setResponseTab}>
              <TabsList variant="line">
                <TabsTrigger value="body">Body</TabsTrigger>
                <TabsTrigger value="headers">Headers</TabsTrigger>
              </TabsList>
              <TabsContent value="body" className="mt-2">
                <pre className="max-h-56 overflow-auto rounded-lg bg-muted p-2 font-mono text-[11px] leading-relaxed">
                  {formatJson(response.body)}
                </pre>
              </TabsContent>
              <TabsContent value="headers" className="mt-2">
                <pre className="max-h-56 overflow-auto rounded-lg bg-muted p-2 font-mono text-[11px] leading-relaxed">
                  {formatJson(response.headers || {})}
                </pre>
              </TabsContent>
            </Tabs>
          ) : null}
        </div>
      </div>
    </div>
  );
}
