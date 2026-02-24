import { randomUUID } from "node:crypto";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const runIntegration = process.env.RUN_INTEGRATION_TESTS === "1";
const describeIntegration = runIntegration ? describe : describe.skip;

const state = vi.hoisted(() => ({
	authUserId: "clerk_test_user",
	currentUser: null as null | {
		id: string;
		firstName: string | null;
		lastName: string | null;
		imageUrl: string | null;
		primaryEmailAddressId: string | null;
		emailAddresses: Array<{ id: string; emailAddress: string }>;
	},
	activeOrgId: null as string | null,
	redirects: [] as string[],
}));

vi.mock("@clerk/nextjs/server", () => ({
	auth: vi.fn(async () => ({ userId: state.authUserId })),
	currentUser: vi.fn(async () => state.currentUser),
}));

vi.mock("next/headers", () => ({
	cookies: vi.fn(async () => ({
		get: (name: string) =>
			name === "active_org_id" && state.activeOrgId
				? { name, value: state.activeOrgId }
				: undefined,
		set: vi.fn(),
		delete: vi.fn(),
	})),
}));

vi.mock("next/navigation", () => ({
	redirect: vi.fn((url: string) => {
		state.redirects.push(url);
		throw new Error(`REDIRECT:${url}`);
	}),
}));

describeIntegration("getTenantCtx (integration)", () => {
	let prisma: (typeof import("@/lib/prisma"))["prisma"];
	const createdUserIds = new Set<string>();
	const createdOrgIds = new Set<string>();

	beforeAll(async () => {
		if (!process.env.DATABASE_URL) {
			throw new Error("DATABASE_URL is required for integration tests");
		}

		delete (globalThis as { prisma?: unknown }).prisma;
		({ prisma } = await import("@/lib/prisma"));
	});

	beforeEach(() => {
		state.redirects = [];
		state.activeOrgId = null;

		const nonce = randomUUID();
		state.authUserId = `clerk_${nonce}`;
		state.currentUser = {
			id: state.authUserId,
			firstName: "Test",
			lastName: "User",
			imageUrl: null,
			primaryEmailAddressId: `email_${nonce}`,
			emailAddresses: [
				{ id: `email_${nonce}`, emailAddress: `tenant-${nonce}@example.test` },
			],
		};
	});

	afterEach(async () => {
		for (const orgId of createdOrgIds) {
			await prisma.organization.deleteMany({ where: { id: orgId } });
		}
		createdOrgIds.clear();

		for (const userId of createdUserIds) {
			await prisma.user.deleteMany({ where: { id: userId } });
		}
		createdUserIds.clear();

		vi.resetModules();
	});

	afterAll(async () => {
		// no-op: cleanup happens per-test
	});

	it("returns tenant context for a valid membership + active org cookie", async () => {
		const nonce = randomUUID();
		const user = await prisma.user.create({
			data: {
				clerkUserId: state.authUserId,
				email: `member-${nonce}@example.test`,
				name: "Member User",
			},
			select: { id: true },
		});
		createdUserIds.add(user.id);

		const org = await prisma.organization.create({
			data: {
				name: "Tenant Alpha",
				memberships: {
					create: { userId: user.id, role: "ADMIN" },
				},
				usage: {
					create: {
						periodStart: new Date("2026-02-01T00:00:00.000Z"),
						periodEnd: new Date("2026-03-01T00:00:00.000Z"),
					},
				},
			},
			select: { id: true },
		});
		createdOrgIds.add(org.id);

		state.activeOrgId = org.id;

		const { getTenantCtx } = await import("@/features/auth/ctx");
		const ctx = await getTenantCtx({ authRedirectTo: "/dashboard" });

		expect(ctx.dbUserId).toBe(user.id);
		expect(ctx.orgId).toBe(org.id);
		expect(ctx.role).toBe("ADMIN");
		expect(ctx.org).toEqual({ name: "Tenant Alpha", plan: "FREE" });
		expect(state.redirects).toEqual([]);
	});

	it("redirects to /onboarding when active_org_id cookie is missing", async () => {
		const { getTenantCtx } = await import("@/features/auth/ctx");

		await expect(getTenantCtx()).rejects.toThrow("REDIRECT:/onboarding");
		expect(state.redirects).toEqual(["/onboarding"]);
	});

	it("redirects to recovery route when active_org_id is stale or unauthorized", async () => {
		state.activeOrgId = `org_missing_${randomUUID()}`;

		const { getTenantCtx } = await import("@/features/auth/ctx");

		await expect(getTenantCtx()).rejects.toThrow(
			"REDIRECT:/onboarding/recover-active-org"
		);
		expect(state.redirects).toEqual(["/onboarding/recover-active-org"]);
	});
});
