'use client';

import { Badge } from '@/components/ui/badge';

export default function CatalogList({ items }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium">{item.name}</p>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </div>
          <Badge variant={item.status === 'available' ? 'secondary' : 'outline'}>
            {item.status.replace('_', ' ')}
          </Badge>
        </div>
      ))}
    </div>
  );
}
