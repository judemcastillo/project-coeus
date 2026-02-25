# Testing Setup (Planned)

This repo uses:

- `Vitest` for unit/integration tests
- `Playwright` for end-to-end tests

## First-time install

```bash
npm install
npx playwright install
```

## Run tests

```bash
npm test
npm run test:watch
npm run test:e2e
```

## Notes

- E2E tests are scaffolded and currently `skip`ped until Clerk test credentials and test environment data are configured.
- Start with `tests/unit/rbac.test.ts`, then add integration tests for `createOrgForUser()` and `getTenantCtx()`.
- `tests/unit/onboarding-actions.test.ts` covers the onboarding server action flow with mocked auth/cookie/redirect boundaries.
- `tests/unit/onboarding-recover-route.test.ts` verifies stale-cookie recovery clears the cookie and redirects correctly.
- `tests/unit/org-select-actions.test.ts` covers org selection validation + cookie setting.
- `tests/unit/org-select-auto-route.test.ts` covers the auto-select redirect branches (0/1/many orgs).

## Integration Tests (DB-backed)

- `tests/integration/create-org-for-user.test.ts` is a real Prisma/Postgres integration test.
- `tests/integration/get-tenant-ctx.test.ts` is a DB-backed integration test with mocked Clerk/Next request APIs.
- `tests/integration/project-service.test.ts` verifies tenant isolation, soft delete behavior, and audit logs for projects.
- It is **disabled by default** to avoid accidental writes to your dev DB.

Run it explicitly:

```bash
RUN_INTEGRATION_TESTS=1 npm test
```

Recommended setup:

- Point `DATABASE_URL` to a dedicated test database before running integration tests.
- Reset/clean the test database between runs (or use a disposable local DB).

## Clerk-safe E2E Auth Strategy (Recommended)

Use Playwright for browser flows, but avoid brittle UI automation for Clerk whenever possible.

### Option A (Recommended for local/dev): Dedicated test Clerk app + seeded test users

- Create a separate Clerk instance for testing.
- Configure test env vars locally/CI to point to that Clerk app.
- Use seeded test users (email/password) and log in through the real sign-in page.

Pros:
- Closest to production behavior
- Exercises your real middleware and redirects

Cons:
- Slower than mocked auth
- Requires test credentials and environment setup

### Option B (Recommended for CI stability later): Test-only auth bypass route/cookie (guarded)

- Add a test-only route enabled only when `NODE_ENV === "test"` (or a dedicated env flag).
- Route sets the app into an authenticated state for a seeded DB user (or stubs Clerk session).
- Use this only in automated tests; never enable in production.
- This repo includes a guarded implementation at:
  - `app/test-support/orgs/route.ts` (create extra org for current bypass user)
  - `app/test-support/login/route.ts`
  - `app/test-support/logout/route.ts`
  - enabled only when `ENABLE_E2E_TEST_BYPASS=1` and not production

Pros:
- Fast and stable
- Removes Clerk UI friction in CI

Cons:
- Less end-to-end realism
- Must be implemented carefully to avoid shipping a bypass

### Practical rollout for your roadmap

1. Start with Option A for Milestone 3/4 smoke tests.
2. Add Option B later if CI E2E becomes flaky/slow.
3. Keep at least one true Clerk login E2E smoke test even after adding a bypass.

### Running the bypass-backed E2E smoke test

```bash
ENABLE_E2E_TEST_BYPASS=1 npm run test:e2e
```
