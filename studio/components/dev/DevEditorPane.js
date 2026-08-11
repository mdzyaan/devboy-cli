'use client';

import dynamic from 'next/dynamic';
import { CopyIcon, XIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  fetchDependencyNames,
  languageForPath,
  registerPackageCompletions,
} from '@/lib/monaco-packages';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

function fileName(path) {
  if (!path) return '';
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

export default function DevEditorPane({
  openTabs,
  activePath,
  onSelectTab,
  onCloseTab,
  routeUrl,
  handlerHint,
}) {
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const packagesRef = useRef([]);
  const providerRef = useRef(null);
  const dirtyMapRef = useRef({});

  const dirty = Boolean(activePath) && content !== savedContent;

  const refreshPackages = useCallback(async () => {
    packagesRef.current = await fetchDependencyNames();
  }, []);

  const loadFile = useCallback(
    async (filePath) => {
      if (!filePath) {
        setContent('');
        setSavedContent('');
        return;
      }
      setBusy(true);
      setStatus('');
      try {
        const res = await fetch(`/api/files/content?path=${encodeURIComponent(filePath)}`);
        const data = await res.json();
        if (!data.ok) {
          setStatus(data.error || 'Failed to open file');
          toast.error(data.error || 'Failed to open file');
          return;
        }
        setContent(data.content);
        setSavedContent(data.content);
        dirtyMapRef.current[filePath] = false;
        await refreshPackages();
      } catch (e) {
        setStatus(String(e));
      } finally {
        setBusy(false);
      }
    },
    [refreshPackages]
  );

  useEffect(() => {
    loadFile(activePath);
  }, [activePath, loadFile]);

  useEffect(() => {
    refreshPackages().catch(() => {});
    return () => {
      if (providerRef.current) {
        providerRef.current.dispose();
        providerRef.current = null;
      }
    };
  }, [refreshPackages]);

  async function save() {
    if (!activePath || !dirty) return;
    setBusy(true);
    setStatus('Saving…');
    try {
      const res = await fetch('/api/files/content', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path: activePath, content }),
      });
      const data = await res.json();
      if (!data.ok) {
        setStatus(data.error || 'Save failed');
        toast.error('Save failed');
        return;
      }
      setSavedContent(content);
      dirtyMapRef.current[activePath] = false;
      setStatus('Saved');
      toast.success('Saved');
    } catch (e) {
      setStatus(String(e));
      toast.error('Save failed');
    } finally {
      setBusy(false);
    }
  }

  function handleEditorMount(_editor, monaco) {
    if (providerRef.current) providerRef.current.dispose();
    providerRef.current = registerPackageCompletions(monaco, () => packagesRef.current);
    refreshPackages().catch(() => {});
  }

  async function copyUrl() {
    if (!routeUrl) return;
    try {
      await navigator.clipboard.writeText(routeUrl);
      toast.success('URL copied');
    } catch {
      toast.error('Copy failed');
    }
  }

  const language = useMemo(() => languageForPath(activePath), [activePath]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-border px-1">
        {openTabs.length === 0 ? (
          <span className="px-2 text-xs text-muted-foreground">No open files</span>
        ) : (
          openTabs.map((path) => (
            <div
              key={path}
              className={cn(
                'group flex h-7 max-w-[12rem] items-center gap-1 rounded-md px-2 text-xs',
                path === activePath
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <button
                type="button"
                className="min-w-0 truncate"
                onClick={() => onSelectTab(path)}
                title={path}
              >
                {fileName(path)}
                {path === activePath && dirty ? ' •' : ''}
              </button>
              <button
                type="button"
                className="rounded p-0.5 opacity-60 hover:bg-background hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(path);
                }}
              >
                <XIcon className="size-3" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3">
        <code className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
          {routeUrl || handlerHint || 'No file selected'}
        </code>
        {routeUrl ? (
          <Button type="button" size="icon-xs" variant="ghost" onClick={copyUrl}>
            <CopyIcon />
          </Button>
        ) : null}
        <span className="text-[10px] text-muted-foreground">{status}</span>
        {dirty ? <Badge variant="secondary">unsaved</Badge> : null}
        <Button type="button" size="sm" disabled={!activePath || !dirty || busy} onClick={save}>
          Save
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        {activePath ? (
          <MonacoEditor
            height="100%"
            theme="vs-light"
            language={language}
            value={content}
            onChange={(value) => setContent(value ?? '')}
            onMount={handleEditorMount}
            options={{
              minimap: { enabled: true },
              fontSize: 13,
              fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
              wordWrap: 'on',
              automaticLayout: true,
              scrollBeyondLastLine: false,
              quickSuggestions: { other: true, comments: false, strings: true },
              suggestOnTriggerCharacters: true,
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
            <div className="max-w-md space-y-2">
              <p>Select a file from the tree, or open a route from Routes.</p>
              <p>
                Prefer{' '}
                <code className="font-mono text-foreground">
                  const {'{'} db, auth {'}'} = require(&apos;devboy&apos;)
                </code>
                . Type require(&apos; for package autocomplete.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
