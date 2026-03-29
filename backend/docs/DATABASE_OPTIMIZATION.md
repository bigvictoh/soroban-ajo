# Database Optimization Guide

## Connection Pooling

The backend uses `pg.Pool` for raw SQL queries alongside Prisma ORM. Pool settings are controlled via environment variables.

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DB_POOL_MAX` | `10` | Maximum connections in pool |
| `DB_POOL_MIN` | `2` | Minimum idle connections |
| `DB_POOL_IDLE_TIMEOUT` | `30000` | Milliseconds before idle connection is closed |
| `DB_POOL_CONNECTION_TIMEOUT` | `5000` | Milliseconds to wait for a connection before error |

### Usage

**Simple query:**
```ts
import { pool } from '../config/database'
const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id])
```

**Managed connection (auto-release):**
```ts
import { withConnection } from '../utils/connectionPool'
const result = await withConnection(async (client) => {
  return client.query('SELECT ...')
})
```

**Transaction:**
```ts
import { withTransaction } from '../utils/connectionPool'
await withTransaction(async (client) => {
  await client.query('INSERT INTO ...')
  await client.query('UPDATE ...')
})
```

**Pool stats (for monitoring):**
```ts
import { getPoolStats } from '../utils/connectionPool'
const { total, idle, waiting } = getPoolStats()
```

## Prisma Connection Pooling

Prisma manages its own connection pool internally. For production, configure via the `DATABASE_URL` connection string parameters:

```
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=10"
```

## Recommendations

- Set `DB_POOL_MAX` to match your database's `max_connections` divided by the number of app instances.
- Monitor `waiting` count — if consistently > 0, increase `DB_POOL_MAX`.
- Use `withTransaction` for any multi-statement operations to ensure atomicity.
