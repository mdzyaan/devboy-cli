'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Thin vertical strip to re-expand a side panel (Postman / IDE style). */
export default function CollapsedRail({ label, onExpand, side = 'left' }) {
  return (
    <div
      className={cn(
        'flex h-full w-9 shrink-0 flex-col items-center border-border bg-muted/20 py-2',
        side === 'left' ? 'border-r' : 'border-l'
      )}
    >
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        className="h-auto min-h-16 w-7 px-0 py-2"
        onClick={onExpand}
        title={`Show ${label}`}
      >
        <span
          className="text-[10px] font-medium tracking-wide text-muted-foreground"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          {label}
        </span>
      </Button>
    </div>
  );
}
