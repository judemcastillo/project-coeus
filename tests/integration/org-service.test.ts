import { randomUUID } from "node:crypto";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

const runIntegration = process.env.RUN_INTEGRATION_TESTS === "1";
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration("org.service (integration)", () => {
	let prisma: (typeof import("@/lib/prisma"))["prisma"];
	let orgService: typeof import("@/features/org/org.service");
	const createdOrgIds = new Set<string>();
	const createdUserIds = new Set<string>();

	beforeAll(async () => {
		if (!process.env.DATABASE_URL) {
			throw new Error("DATABASE_URL is required for integration tests");
		}

		delete (globalThis as { prisma?: unknown }).prisma;
		({ prisma } = await import("@/lib/prisma"));
		orgService = await import("@/features/org/org.service");
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
				clerkUserId: `clerk_org_${nonce}`,
				email: `org-${nonce}@example.test`,
				name: "Org Test User",
			},
			select: { id: true },
		});
		createdUserIds.add(user.id);

		const org = await prisma.organization.create({
			data: {
				name: `Org ${nonce}`,
				memberships: { create: { userId: user.id, role } },
				usage: {
					create: {
						periodStart: new Date("2026-03-01T00:00:00.000Z"),
						periodEnd: new Date("2026-04-01T00:00:00.000Z"),
					},
				},
				projects: {
					create: { name: "Project A", description: "Demo" },
				},
			},
			select: {
				id: true,
				name: true,
			},
		});
		createdOrgIds.add(org.id);

		const project = await prisma.project.findFirstOrThrow({
			where: { organizationId: org.id, deletedAt: null },
			select: { id: true },
		});

		await prisma.task.create({
			data: {
				organizationId: org.id,
				projectId: project.id,
				title: "Task A",
				status: "INPROGRESS",
			},
		});

		return {
			orgId: org.id,
			orgName: org.name,
			ctx: {
				orgId: org.id,
				role,
			},
		};
	}

	it("allows OWNER to delete organization and cascades related records", async () => {
		const tenant = await seedTenant("OWNER");

		await orgService.deleteOrg(tenant.ctx, { confirmName: tenant.orgName });
		createdOrgIds.delete(tenant.orgId);

		const orgCount = await prisma.organization.count({
			where: { id: tenant.orgId },
		});
		expect(orgCount).toBe(0);

		const usageCount = await prisma.usage.count({
			where: { organizationId: tenant.orgId },
		});
		expect(usageCount).toBe(0);

		const membershipCount = await prisma.membership.count({
			where: { organizationId: tenant.orgId },
		});
		expect(membershipCount).toBe(0);

		const projectCount = await prisma.project.count({
			where: { organizationId: tenant.orgId },
		});
		expect(projectCount).toBe(0);

		const taskCount = await prisma.task.count({
			where: { organizationId: tenant.orgId },
		});
		expect(taskCount).toBe(0);
	});

	it("enforces OWNER-only org deletion", async () => {
		const tenant = await seedTenant("ADMIN");
		await expect(
			orgService.deleteOrg(tenant.ctx, { confirmName: tenant.orgName })
		).rejects.toThrow("FORBIDDEN");
	});

	it("rejects deletion when confirmation name does not match", async () => {
		const tenant = await seedTenant("OWNER");
		await expect(
			orgService.deleteOrg(tenant.ctx, { confirmName: "wrong" })
		).rejects.toThrow("CONFIRMATION_MISMATCH");
	});
});
