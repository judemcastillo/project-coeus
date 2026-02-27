import { randomUUID } from "node:crypto";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

const runIntegration = process.env.RUN_INTEGRATION_TESTS === "1";
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration("usage.service (integration)", () => {
	let prisma: (typeof import("@/lib/prisma"))["prisma"];
	let usageService: typeof import("@/features/usage/usage.service");
	const createdOrgIds = new Set<string>();
	const createdUserIds = new Set<string>();

	beforeAll(async () => {
		if (!process.env.DATABASE_URL) {
			throw new Error("DATABASE_URL is required for integration tests");
		}

		delete (globalThis as { prisma?: unknown }).prisma;
		({ prisma } = await import("@/lib/prisma"));
		usageService = await import("@/features/usage/usage.service");
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
	});

	async function seedTenant(params?: { plan?: "FREE" | "PRO" }) {
		const nonce = randomUUID();
		const user = await prisma.user.create({
			data: {
				clerkUserId: `clerk_usage_${nonce}`,
				email: `usage-${nonce}@example.test`,
				name: "Usage Test User",
			},
			select: { id: true },
		});
		createdUserIds.add(user.id);

		const org = await prisma.organization.create({
			data: {
				name: `Usage Org ${nonce}`,
				plan: params?.plan ?? "FREE",
				memberships: {
					create: { userId: user.id, role: "OWNER" },
				},
				usage: {
					create: {
						periodStart: new Date("2026-02-01T00:00:00.000Z"),
						periodEnd: new Date("2026-03-01T00:00:00.000Z"),
					},
				},
			},
			select: { id: true, plan: true, name: true },
		});
		createdOrgIds.add(org.id);

		return {
			ctx: {
				orgId: org.id,
				org: {
					name: org.name,
					plan: org.plan,
				},
			},
			orgId: org.id,
		};
	}

	it("rolls over stale monthly usage periods and resets counters", async () => {
		const tenant = await seedTenant({ plan: "FREE" });

		await prisma.usage.update({
			where: { organizationId: tenant.orgId },
			data: {
				periodStart: new Date("2026-01-01T00:00:00.000Z"),
				periodEnd: new Date("2026-02-01T00:00:00.000Z"),
				aiRequestsCount: 9,
				tokensUsed: 999,
			},
		});

		const summary = await usageService.getUsageSummary(tenant.ctx, {
			now: new Date("2026-02-10T00:00:00.000Z"),
		});

		expect(summary.aiRequests.used).toBe(0);
		expect(summary.aiRequests.remaining).toBe(summary.aiRequests.limit);
		expect(summary.tokensUsed).toBe(0);
		expect(summary.periodStart.toISOString()).toBe("2026-02-01T00:00:00.000Z");
		expect(summary.periodEnd.toISOString()).toBe("2026-03-01T00:00:00.000Z");
	});

	it("blocks AI requests when request count is at the plan limit", async () => {
		const tenant = await seedTenant({ plan: "FREE" });
		const freeLimit = usageService.getAiRequestLimitForPlan("FREE");

		await prisma.usage.update({
			where: { organizationId: tenant.orgId },
			data: { aiRequestsCount: freeLimit },
		});

		await expect(usageService.assertAiRequestWithinLimit(tenant.ctx)).rejects.toThrow(
			"USAGE_LIMIT_EXCEEDED"
		);
	});

	it("increments usage counters transactionally and resets stale periods first", async () => {
		const tenant = await seedTenant({ plan: "PRO" });

		await prisma.usage.update({
			where: { organizationId: tenant.orgId },
			data: {
				periodStart: new Date("2026-02-01T00:00:00.000Z"),
				periodEnd: new Date("2026-03-01T00:00:00.000Z"),
				aiRequestsCount: 4,
				tokensUsed: 400,
			},
		});

		const updated = await usageService.incrementAiUsage({
			orgId: tenant.orgId,
			tokensUsed: 123,
			now: new Date("2026-03-10T00:00:00.000Z"),
		});

		expect(updated.aiRequestsCount).toBe(1);
		expect(updated.tokensUsed).toBe(123);
		expect(updated.periodStart.toISOString()).toBe("2026-03-01T00:00:00.000Z");
		expect(updated.periodEnd.toISOString()).toBe("2026-04-01T00:00:00.000Z");
	});
});
