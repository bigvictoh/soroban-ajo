# Database Migrations (Prisma)

This document describes how to manage schema versions and seed data for the `soroban-ajo` backend.

## Goals

- Version-control schema changes via `prisma/migrations`
- Provide repeatable local/dev/test seeding to bootstrap data
- Provide rollback path through Prisma migration commands
- Document workflow for development and deployment

## How to migrate

1. Ensure `DATABASE_URL` points to the target environment.
2. In `backend/prisma/schema.prisma`, edit or add models/fields.
3. Run migration locally:
   - `npm run db:migrate -- --name your-description`
4. Review generated migration folder under `backend/prisma/migrations`.
5. Run any model-specific seeds if required: `npm run db:seed`.
6. Commit all migration files and updated schema.

## How to deploy migrations

- Use `npm run db:migrate:deploy` in staging/CI/production.
- For a clean slate in development, `npm run db:migrate:reset` (destructive).

## Rollbacks

- Prisma supports `migrate reset` for local rollback.
- For controlled rollback to a previous migration, inspect and apply with:
  - `npx prisma migrate resolve --applied "20260101000000_init"` etc.
  - then `npx prisma migrate deploy`.
- Keep backups before production migration rollback.

## Seeding

- Run `npm run db:seed` in `backend` to run `prisma/seed.ts`.
- Development entrypoint clears relevant tables before seed.
- Add new data files in `backend/prisma/seeds` and import in `seed.ts`.

## Testing

- Create dedicated test environment DB with `DATABASE_URL` set.
- Run migrations with `npm run db:migrate`.
- Run `npm run db:seed`.
- Verify expected rows in tables (users/groups/goals).

## Best Practices

- Use descriptive migration names.
- Never edit old migration files after they are applied in production.
- Keep seeds anonymized and non-production sensitive.
- Use transactions for complex seed operations.
