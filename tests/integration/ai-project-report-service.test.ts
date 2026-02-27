import { randomUUID } from "node:crypto";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

const runIntegration = process.env.RUN_INTEGRATION_TESTS === "1";
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration("project-report AI service (integration)", () => {
	let prisma: (typeof import("@/lib/prisma"))["prisma"];
	let service: typeof import("@/features/ai/project-report.service");
	let usageService: typeof import("@/features/usage/usage.service");
	const createdOrgIds = new Set<string>();
	const createdUserIds = new Set<string>();

	beforeAll(async () => {
		if (!process.env.DATABASE_URL) {
			throw new Error("DATABASE_URL is required for integration tests");
		}

		delete (globalThis as { prisma?: unknown }).prisma;
		({ prisma } = await import("@/lib/prisma"));
		service = await import("@/features/ai/project-report.service");
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

	async function seedTenant(role: "OWNER" | "ADMIN" | "MEMBER" = "OWNER") {
		const nonce = randomUUID();
		const user = await prisma.user.create({
			data: {
				clerkUserId: `clerk_ai_${nonce}`,
				email: `ai-${nonce}@example.test`,
				name: "AI Test User",
			},
			select: { id: true },
		});
		createdUserIds.add(user.id);

		const org = await prisma.organization.create({
			data: {
				name: `AI Org ${nonce}`,
				plan: "FREE",
				memberships: { create: { userId: user.id, role } },
				usage: {
					create: {
						periodStart: new Date("2026-02-01T00:00:00.000Z"),
						periodEnd: new Date("2026-03-01T00:00:00.000Z"),
					},
				},
				projects: {
					create: {
						name: "Roadmap Project",
						description: "Deliver milestone 8 and validate usage enforcement.",
					},
				},
			},
			select: {
				id: true,
				name: true,
				plan: true,
				projects: { select: { id: true, name: true } },
			},
		});
		createdOrgIds.add(org.id);

		return {
			ctx: {
				dbUserId: user.id,
				orgId: org.id,
				role,
				org: { name: org.name, plan: org.plan },
			},
			projectId: org.projects[0]!.id,
		};
	}

	it("generates report, writes AIRequest, audit log output, and increments usage", async () => {
		const tenant = await seedTenant("OWNER");

		const result = await service.generateProjectStatusReport(tenant.ctx, {
			projectId: tenant.projectId,
		});

		expect(result.project.id).toBe(tenant.projectId);
		expect(result.report.output).toContain("Project Status Report:");
		expect(result.aiRequest.model).toBe("demo-project-report-v1");

		const usage = await prisma.usage.findUniqueOrThrow({
			where: { organizationId: tenant.ctx.orgId },
			select: { aiRequestsCount: true, tokensUsed: true },
		});
		expect(usage.aiRequestsCount).toBe(1);
		expect(usage.tokensUsed).toBeGreaterThan(0);

		const aiRequests = await prisma.aIRequest.findMany({
			where: {
				organizationId: tenant.ctx.orgId,
				userId: tenant.ctx.dbUserId,
				feature: "project_report",
			},
			select: { id: true, tokensIn: true, tokensOut: true },
		});
		expect(aiRequests).toHaveLength(1);
		expect(aiRequests[0]!.tokensIn).toBeGreaterThan(0);
		expect(aiRequests[0]!.tokensOut).toBeGreaterThan(0);

		const logs = await prisma.auditLog.findMany({
			where: {
				organizationId: tenant.ctx.orgId,
				action: "ai.project_report.generate",
				targetType: "Project",
				targetId: tenant.projectId,
			},
			select: { metadata: true },
		});
		expect(logs).toHaveLength(1);
		expect(logs[0]!.metadata).toMatchObject({
			projectId: tenant.projectId,
			model: "demo-project-report-v1",
		});
	});

	it("blocks generation at the usage limit and does not create AIRequest rows", async () => {
		const tenant = await seedTenant("ADMIN");
		const freeLimit = usageService.getAiRequestLimitForPlan("FREE");

		await prisma.usage.update({
			where: { organizationId: tenant.ctx.orgId },
			data: { aiRequestsCount: freeLimit },
		});

		await expect(
			service.generateProjectStatusReport(tenant.ctx, { projectId: tenant.projectId })
		).rejects.toThrow("USAGE_LIMIT_EXCEEDED");

		const aiRequestCount = await prisma.aIRequest.count({
			where: { organizationId: tenant.ctx.orgId },
		});
		expect(aiRequestCount).toBe(0);
	});

	it("enforces tenant RBAC and tenant scoping", async () => {
		const memberTenant = await seedTenant("MEMBER");
		await expect(
			service.generateProjectStatusReport(memberTenant.ctx, {
				projectId: memberTenant.projectId,
			})
		).rejects.toThrow("FORBIDDEN");

		const tenantA = await seedTenant("OWNER");
		const tenantB = await seedTenant("OWNER");
		await expect(
			service.generateProjectStatusReport(tenantB.ctx, { projectId: tenantA.projectId })
		).rejects.toThrow("NOT_FOUND");
	});
});
