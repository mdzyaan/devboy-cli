'use client';

import {
  ArrowLeftIcon,
  BugIcon,
  FolderTreeIcon,
  PanelBottomIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function ToggleChip({ active, onClick, icon: Icon, label }) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? 'secondary' : 'ghost'}
      className={cn('h-7 gap-1.5 px-2 text-xs', !active && 'text-muted-foreground')}
      onClick={onClick}
      aria-pressed={active}
      title={active ? `Hide ${label}` : `Show ${label}`}
    >
      <Icon className="size-3.5" />
      {label}
    </Button>
  );
}

export default function DevTopBar({
  cwd,
  onExit,
  showLeft,
  showRight,
  showBottom,
  onToggleLeft,
  onToggleRight,
  onToggleBottom,
}) {
  const projectName = cwd ? cwd.split('/').filter(Boolean).pop() : 'project';

  return (
    <header className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-background px-3">
      <Button type="button" size="sm" variant="ghost" onClick={onExit}>
        <ArrowLeftIcon data-icon="inline-start" />
        Studio
      </Button>
      <div className="min-w-0">
        <div className="text-sm font-semibold tracking-tight">Dev Mode</div>
        <div className="truncate font-mono text-[10px] text-muted-foreground" title={cwd}>
          {projectName}
          {cwd ? ` · ${cwd}` : ''}
        </div>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <ToggleChip active={showLeft} onClick={onToggleLeft} icon={FolderTreeIcon} label="Files" />
        <ToggleChip active={showRight} onClick={onToggleRight} icon={BugIcon} label="Debug" />
        <ToggleChip
          active={showBottom}
          onClick={onToggleBottom}
          icon={PanelBottomIcon}
          label="Console"
        />
      </div>
    </header>
  );
}
