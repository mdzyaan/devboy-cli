'use client';

import { ChevronDownIcon, ChevronRightIcon, FileIcon, FolderIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function TreeNode({ node, depth, activePath, onOpen }) {
  const [open, setOpen] = useState(depth < 2);

  if (node.type === 'directory') {
    return (
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-full justify-start gap-1.5 rounded-none px-2 font-normal"
          style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <ChevronDownIcon className="size-3.5" /> : <ChevronRightIcon className="size-3.5" />}
          <FolderIcon className="size-3.5 text-muted-foreground" />
          <span className="truncate">{node.name}</span>
        </Button>
        {open
          ? (node.children || []).map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                activePath={activePath}
                onOpen={onOpen}
              />
            ))
          : null}
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        'h-8 w-full justify-start gap-1.5 rounded-none px-2 font-normal',
        activePath === node.path && 'bg-accent text-accent-foreground'
      )}
      style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}
      onClick={() => onOpen(node.path)}
    >
      <FileIcon className="size-3.5 text-muted-foreground" />
      <span className="truncate">{node.name}</span>
    </Button>
  );
}

export default function FileTree({ tree, activePath, onOpen }) {
  if (!tree) return null;

  return (
    <div className="py-1">
      {(tree.children || []).map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          depth={0}
          activePath={activePath}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}
