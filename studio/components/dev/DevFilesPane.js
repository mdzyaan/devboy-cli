'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import FileTree from '@/components/FileTree';
import PanelHeader from '@/components/dev/PanelHeader';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

function filterTree(node, query) {
  if (!node) return null;
  const q = query.trim().toLowerCase();
  if (!q) return node;

  if (node.type === 'file') {
    return node.name.toLowerCase().includes(q) ? node : null;
  }

  const children = (node.children || [])
    .map((child) => filterTree(child, q))
    .filter(Boolean);

  if (node.name.toLowerCase().includes(q) || children.length) {
    return { ...node, children };
  }
  return null;
}

export default function DevFilesPane({ activePath, onOpen, onCollapse }) {
  const [tree, setTree] = useState(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/files/tree');
      const data = await res.json();
      setTree(data);
      setError('');
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    if (!tree) return null;
    if (!query.trim()) return tree;
    const children = (tree.children || [])
      .map((child) => filterTree(child, query))
      .filter(Boolean);
    return { ...tree, children };
  }, [tree, query]);

  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        title="Files"
        subtitle={tree?.root || ''}
        onToggle={onCollapse}
        collapsed={false}
      />
      <div className="border-b border-border p-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter files…"
          className="h-7 text-xs"
        />
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {error ? <p className="p-2 text-xs text-destructive">{error}</p> : null}
        {!filtered ? (
          <div className="space-y-2 p-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-5/6" />
            <Skeleton className="h-5 w-4/6" />
          </div>
        ) : (
          <FileTree tree={filtered} activePath={activePath} onOpen={onOpen} />
        )}
      </ScrollArea>
    </div>
  );
}
