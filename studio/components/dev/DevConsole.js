'use client';

import { Button } from '@/components/ui/button';

import PanelHeader from '@/components/dev/PanelHeader';

export default function DevConsole({ logs, onClear, collapsed, onToggle }) {
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="flex h-8 w-full items-center justify-between border-t border-border bg-muted/30 px-3 text-left hover:bg-muted/50"
      >
        <span className="text-xs font-medium">Console</span>
        <span className="text-[10px] text-muted-foreground">
          {logs.length ? `${logs.length} lines · click to expand` : 'click to expand'}
        </span>
      </button>
    );
  }

  return (
    <div className="flex h-full flex-col bg-muted/30">
      <PanelHeader
        title="Console"
        onToggle={onToggle}
        collapsed={false}
        actions={
          <Button type="button" size="xs" variant="ghost" onClick={onClear}>
            Clear
          </Button>
        }
      />
      <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
        {logs.length ? logs.join('\n') : 'Debug runs and handler console.log output appear here.'}
      </pre>
    </div>
  );
}
