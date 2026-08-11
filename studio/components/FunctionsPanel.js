'use client';

import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const EXAMPLES = [
  {
    id: 'import',
    title: 'Import',
    description: 'Default modules from require("devboy")',
    code: `const { db, auth } = require('devboy');`,
  },
  {
    id: 'dbFind',
    title: 'db — list rows',
    description: 'Neon / Postgres table find',
    code: `const { db } = require('devboy');

module.exports = async (params, context) => {
  const items = await db.table('items').find();
  return { ok: true, items };
};`,
  },
  {
    id: 'dbWhere',
    title: 'db — CRUD + query',
    description: 'where / insert / update / delete / raw SQL',
    code: `const rows = await db.table('items').where({ id: params.id }).find();
const created = await db.table('items').insert({ name: params.name });
await db.table('items').where({ id: params.id }).update({ name: 'new' });
await db.table('items').where({ id: params.id }).delete();

// Raw SQL when you need it:
const result = await db.query('select now() as now');`,
  },
  {
    id: 'auth',
    title: 'auth — protect a route',
    description: 'Clerk requireAuth / getUserId',
    code: `const { auth } = require('devboy');

module.exports = async (params, context) => {
  const user = await auth.requireAuth(context);
  if (user.error) return user.error;
  return { ok: true, userId: auth.getUserId(user) };
};`,
  },
  {
    id: 'both',
    title: 'db + auth together',
    description: 'Scoped query for the signed-in user',
    code: `const { db, auth } = require('devboy');

module.exports = async (params, context) => {
  const user = await auth.requireAuth(context);
  if (user.error) return user.error;

  const items = await db.table('items').where({ user_id: user.userId }).find();
  return { ok: true, items };
};`,
  },
];

function CodeCard({ title, description, code }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Copy failed — select the code manually');
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={copy}>
          Copy
        </Button>
      </CardHeader>
      <CardContent>
        <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed text-foreground">
          {code}
        </pre>
      </CardContent>
    </Card>
  );
}

export default function FunctionsPanel({ onOpenEditor }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Functions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Built-in helpers from <code className="font-mono text-foreground">require(&apos;devboy&apos;)</code>.
            Prefer these over relative <code className="font-mono text-foreground">../../../lib</code> paths.
          </p>
        </div>
        <Button type="button" onClick={() => onOpenEditor?.()}>
          Open Editor
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">db</CardTitle>
              <CardDescription>Neon / Postgres — table CRUD + raw query</CardDescription>
            </div>
            <Badge variant="secondary">default</Badge>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">auth</CardTitle>
              <CardDescription>Clerk — requireAuth / getUserId</CardDescription>
            </div>
            <Badge variant="secondary">default</Badge>
          </CardHeader>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">
        Needs DATABASE_URL for db, CLERK_SECRET_KEY for auth (set in Overview → Secrets).
      </p>

      <div className="grid gap-4">
        {EXAMPLES.map((ex) => (
          <CodeCard key={ex.id} title={ex.title} description={ex.description} code={ex.code} />
        ))}
      </div>

      <Card className="bg-muted/40">
        <CardHeader>
          <CardTitle className="text-base">Handler style</CardTitle>
          <CardDescription>
            Prefer <code className="font-mono">async (params, context) =&gt; {'{'} return plainObject; {'}'}</code>.
            Devboy wraps that as HTTP 200 JSON. Returning{' '}
            <code className="font-mono">{'{'} statusCode, body {'}'}</code> still works (Lambda style).
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
