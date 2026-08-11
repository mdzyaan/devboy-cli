# devboy-cli

Backend-only toolkit: local Lambda-compatible API, pluggable **Clerk / Neon / MongoDB Atlas / QStash**, **AWS deploy** with a public URL, and a **local Next.js Studio** for configuration (never deployed).

## Install

```bash
npm install -g devboy-cli
# or use via npx / project dependency
```

## Commands

| Command | Purpose |
|---------|---------|
| `devboy start` | Local API on `:3000` (API Gateway-shaped events) |
| `devboy studio` | Local config UI (bundled catalog, offline) |
| `devboy deploy` | Deploy API to AWS (Lambda + HTTP API) |
| `devboy doctor` | Check AWS profile + integration env |
| `devboy apply` | Scaffold auth/db/cron helpers into the project |
| `devboy new:route` | Add a route handler |
| `devboy new:job` | Add a cron job route |
| `devboy catalog` | Print bundled integrations JSON |

## Functions SDK

In route handlers, prefer:

```js
const { db, auth } = require('devboy');

module.exports = async (params, context) => {
  // const user = await auth.requireAuth(context);
  // if (user.error) return user.error;
  const items = await db.table('items').find();
  return { ok: true, items };
};
```

No `../../../lib/...` paths. Plain object returns become `200` JSON; `{ statusCode, body }` still works (Lambda style).

## Config (`devboy.config.js`)

```js
module.exports = {
  compute: { provider: 'aws', region: 'us-east-1' },
  auth: { provider: 'clerk' },
  db: { provider: 'neon' },
  cron: { provider: 'qstash' }, // or 'none'
  api: { handler: 'index.js', routes: [] },
  jobs: [],
};
```

Secrets go in `.env.local`. Azure / GCP / OCI compute providers are stubbed for later.

## AWS accounts

Use an existing AWS profile / SSO. New accounts: create at [aws.amazon.com](https://aws.amazon.com/), then `aws configure`. Devboy does not create AWS accounts.

## Create a project

```bash
npx create-devboy-app my-api
cd my-api
npm run studio
```
