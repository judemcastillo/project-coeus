This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Auth + Tenant Guard Flow

This app uses Clerk for authentication and an `active_org_id` cookie for workspace context.

### Helpers

- `features/auth/requireAuth.ts`
  - Auth-only guard for pages/actions.
  - Redirects unauthenticated users to `/sign-in?redirect_url=...`.

- `features/auth/ctx.ts` (`getTenantCtx`)
  - Tenant guard for protected pages/actions.
  - Resolves DB user (`getDbUser()`), active org cookie, membership, and role.
  - Returns tenant context: `dbUserId`, `orgId`, `role`, and `org` (`name`, `plan`).

- `features/tenant/activeOrg.ts`
  - Reads/sets/clears the `active_org_id` cookie.

### Redirect Rules

- Not signed in -> `/sign-in?redirect_url=...`
- Signed in + no active org cookie -> `/onboarding`
- Signed in + stale/invalid active org cookie -> `/onboarding/recover-active-org` (clears cookie, then redirects to `/onboarding`)
- Signed in + valid membership -> protected page renders

### Current Protected Routes

- `app/onboarding/page.tsx`: uses `requireAuth("/onboarding")`
- `app/dashboard/page.tsx`: uses `getTenantCtx()`

### Server Action Pattern (current)

- `app/onboarding/actions.ts`
  - `requireAuth(...)` first
  - validate input
  - run business logic (`createOrgForUser`)
  - set cookie (`setActiveOrgId`)
  - redirect

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
