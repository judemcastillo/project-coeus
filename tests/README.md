# Testing Guide

This repo uses:

- `Vitest` for unit/integration tests
- `Playwright` for E2E tests

## Install

```bash
npm install
npx playwright install
```

## Run Tests

```bash
npm test
npm run test:watch
npm run test:e2e
```

## Unit Tests

Unit tests mock framework boundaries (`next/navigation`, Clerk helpers, cache revalidation) and focus on:

- tenant guard branches
- RBAC behavior
- server-action validation + redirect behavior
- service-layer invariants where pure mocking is enough

## Integration Tests (DB-backed)

Integration tests use real Prisma/Postgres and are intentionally disabled by default.

Run explicitly:

```bash
RUN_INTEGRATION_TESTS=1 npm test
```

Requirements:

- `DATABASE_URL` must point to a test-safe database
- clean/reset test DB between runs
- never point integration tests at production data

## E2E Strategy

Preferred local/CI strategy is guarded bypass-backed auth for stability, while preserving at least one realistic sign-in smoke test when possible.

Bypass routes live under `app/test-support/*` and are enabled only when:

- `ENABLE_E2E_TEST_BYPASS=1`
- environment is non-production

Run bypass mode:

```bash
ENABLE_E2E_TEST_BYPASS=1 npm run test:e2e
```

## Current Coverage Highlights

- onboarding, org selection, and stale active-org recovery
- `getTenantCtx()` tenant resolution + redirects
- projects and tasks tenant isolation + soft delete + audit logs
- members RBAC and role-change constraints
- usage limits and AI report generation paths
- AI provider fallback behavior for deterministic E2E
