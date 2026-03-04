# Project Coeus

Multi-tenant SaaS starter built with Next.js App Router, TypeScript, Prisma/Postgres, and Clerk.

## Tech Stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS
- Prisma ORM + Postgres
- Clerk authentication
- Vitest (unit + integration) + Playwright (E2E)

## Architecture

### Tenant model

- Tenant context is cookie-based via `active_org_id`.
- Tenant is not encoded in the URL (no `/${orgId}` routing).
- `getTenantCtx()` is the central guard for tenant-protected pages/actions.

`getTenantCtx()` resolves:

- authenticated user (`requireAuth` + Clerk)
- DB user (`getDbUser`)
- active org cookie
- membership + role in org

Redirect behavior:

- unauthenticated -> `/sign-in?redirect_url=...`
- missing active org -> `/onboarding`
- stale/unauthorized active org -> `/onboarding/recover-active-org`

### Multi-tenant boundaries

All tenant data reads/writes are scoped by `organizationId` and enforced in services:

- projects (`features/project/project.service.ts`)
- tasks (`features/task/task.service.ts`)
- members (`features/member/member.service.ts`)
- AI reports (`features/ai/project-report.service.ts`)
- usage (`features/usage/usage.service.ts`)

### Authorization model

Roles:

- `OWNER`
- `ADMIN`
- `MEMBER`

RBAC helpers:

- `requireOwner(ctx)`
- `requireAdmin(ctx)`

Current policy:

- owners: full org/member management
- admins: manage projects/tasks + AI report generation + usage simulation page
- members: read-only for protected resources

### Mutation pattern

- Server actions under route folders (e.g. `app/projects/actions.ts`)
- Action flow: tenant guard -> RBAC -> input validation (`zod`) -> service call -> cache revalidation -> route feedback
- Audit logs are written for key mutations and AI operations

## Core Features

### Onboarding and org switching

- onboarding creates org + owner membership + usage row + active tenant cookie
- org switcher and org selector support multi-org users
- stale cookie recovery flow clears bad cookie and returns to onboarding

### Projects

- tenant-scoped CRUD
- soft delete (`deletedAt`)
- audit log trail for create/update/delete

### Tasks

- tenant-scoped CRUD linked to projects
- optional `priority` (`LOW`/`MEDIUM`/`HIGH`)
- `status` (`INPROGRESS`/`DONE`/`ONHOLD`)
- soft delete + audit logs

### Usage limits

- usage tracked in `Usage`
- monthly window with rollover/reset support
- request-limit checks for AI generation
- UI pages:
  - `/settings/usage`
  - `/settings/usage/test` (manual simulation)

### AI project reports

- route: `/ai/project-report`
- tenant-scoped project report generation
- RBAC + usage-limit enforcement
- logs to `AIRequest` + `AuditLog` (including saved output metadata)

Provider adapter:

- `features/ai/provider.ts`
- Gemini is used when `GEMINI_API_KEY` is set
- deterministic fallback is used when:
  - `ENABLE_E2E_TEST_BYPASS=1`, or
  - Gemini key is missing

## Security notes

- tenant boundary checks are server-side (not client-trust based)
- test-support auth routes are guarded and intended only for non-production E2E use
- bypass behavior is blocked in production by guard checks in `features/auth/e2eBypass.ts`
- sensitive auth/tenant decisions happen in server code (`getTenantCtx`, service layer)

## Local Development

1. Install deps

```bash
npm install
```

2. Configure env (example keys)

- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `GEMINI_API_KEY` (optional)
- `ENABLE_E2E_TEST_BYPASS` (optional, test only)

3. Apply migrations

```bash
npx prisma migrate deploy
```

4. (Optional) Seed demo data

```bash
npm run db:seed
```

5. Run app

```bash
npm run dev
```

## Testing

Run all unit tests:

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

Integration tests are DB-backed and disabled by default:

```bash
RUN_INTEGRATION_TESTS=1 npm test
```

E2E tests:

```bash
npm run test:e2e
```

Bypass-backed E2E mode (local/CI smoke):

```bash
ENABLE_E2E_TEST_BYPASS=1 npm run test:e2e
```

## Recruiter/Demo Flow

Recommended walkthrough:

1. Sign in as seeded owner/admin user.
2. Open dashboard and explain tenant context (`active_org_id`).
3. Show `/projects` create/update/delete and role-based restrictions.
4. Show `/tasks` with project linkage + status/priority lifecycle.
5. Show `/members` owner-only role management.
6. Show `/settings/usage` current period counters.
7. Generate report in `/ai/project-report` and verify usage increments + history.
8. Switch org and show strict tenant isolation across all pages.

## Useful Paths

- `features/auth/ctx.ts` - tenant guard
- `features/auth/rbac.ts` - role checks
- `features/usage/usage.service.ts` - usage logic
- `features/ai/project-report.service.ts` - AI report business logic
- `app/test-support/*` - guarded E2E support routes
- `tests/` - unit, integration, and E2E coverage
