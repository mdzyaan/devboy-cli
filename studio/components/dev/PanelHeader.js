'use client';

import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function PanelHeader({
  title,
  subtitle,
  collapsed,
  onToggle,
  actions,
  className,
}) {
  return (
    <div
      className={cn(
        'flex h-8 shrink-0 items-center gap-1 border-b border-border bg-muted/20 px-1.5',
        className
      )}
    >
      {onToggle ? (
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={onToggle}
          aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
          title={collapsed ? `Expand ${title}` : `Collapse ${title}`}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
        </Button>
      ) : null}
      <button
        type="button"
        className="min-w-0 flex-1 truncate text-left"
        onClick={onToggle}
        disabled={!onToggle}
      >
        <span className="text-xs font-medium">{title}</span>
        {subtitle ? (
          <span className="ml-1.5 truncate font-mono text-[10px] text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </button>
      {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
    </div>
  );
}
