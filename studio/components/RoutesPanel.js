'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRoutes } from '@/hooks/use-routes';

export default function RoutesPanel({ onOpenHandler, onDebug }) {
  const { routes, jobs, error, loading, refresh } = useRoutes();
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState('/hello');
  const [method, setMethod] = useState('GET');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  async function createRoute(e) {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      const res = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path, method }),
      });
      const data = await res.json();
      if (!data.ok) {
        setFormError(data.error || 'Failed to create route');
        return;
      }
      await refresh();
      setOpen(false);
      toast.success('Route created');
      if (data.route?.handler) onOpenHandler?.(data.route.handler);
    } catch (err) {
      setFormError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Routes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            API handlers from devboy.config.js. Click a row to edit the file.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button type="button" />}>New route</DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={createRoute}>
              <DialogHeader>
                <DialogTitle>New route</DialogTitle>
                <DialogDescription>Creates a handler file and registers it in config.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="route-path">Path</Label>
                  <Input
                    id="route-path"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    placeholder="/users"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select
                    value={method}
                    onValueChange={(value) => {
                      if (value) setMethod(value);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={busy}>
                  Create route
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="rounded-xl border border-border">
        {loading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Method</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>Handler</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-36" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No routes yet.
                  </TableCell>
                </TableRow>
              ) : (
                routes.map((r) => (
                  <TableRow key={`${r.method}:${r.path}`}>
                    <TableCell>
                      <Badge variant="outline">{r.method}</Badge>
                    </TableCell>
                    <TableCell
                      className="cursor-pointer font-medium"
                      onClick={() => onOpenHandler?.(r.handler)}
                    >
                      {r.path}
                    </TableCell>
                    <TableCell
                      className="cursor-pointer font-mono text-xs text-muted-foreground"
                      onClick={() => onOpenHandler?.(r.handler)}
                    >
                      {r.handler}
                    </TableCell>
                    <TableCell>
                      {r.exists ? (
                        <Badge variant="secondary">ok</Badge>
                      ) : (
                        <Badge variant="destructive">missing</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onDebug?.(r)}
                        >
                          Debug
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => onOpenHandler?.(r.handler)}
                        >
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {jobs.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Jobs ({jobs.length})</h2>
          <div className="rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Handler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((j) => (
                  <TableRow
                    key={j.name}
                    className="cursor-pointer"
                    onClick={() => j.handler && onOpenHandler?.(j.handler)}
                  >
                    <TableCell className="font-medium">{j.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {j.schedule}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {j.handler}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
