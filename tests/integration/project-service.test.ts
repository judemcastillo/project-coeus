import { randomUUID } from "node:crypto";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

const runIntegration = process.env.RUN_INTEGRATION_TESTS === "1";
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration("project.service (integration)", () => {
	let prisma: (typeof import("@/lib/prisma"))["prisma"];
	let service: typeof import("@/features/project/project.service");
	const createdOrgIds = new Set<string>();
	const createdUserIds = new Set<string>();

	beforeAll(async () => {
		if (!process.env.DATABASE_URL) {
			throw new Error("DATABASE_URL is required for integration tests");
		}

		delete (globalThis as { prisma?: unknown }).prisma;
		({ prisma } = await import("@/lib/prisma"));
		service = await import("@/features/project/project.service");
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

	async function seedTenant(
		label: string,
		role: "OWNER" | "ADMIN" | "MEMBER" = "OWNER"
	) {
		const nonce = randomUUID();
		const user = await prisma.user.create({
			data: {
				clerkUserId: `clerk_${label}_${nonce}`,
				email: `${label}-${nonce}@example.test`,
				name: `${label} user`,
			},
			select: { id: true },
		});
		createdUserIds.add(user.id);

		const org = await prisma.organization.create({
			data: {
				name: `${label} org`,
				memberships: { create: { userId: user.id, role } },
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

		return {
			dbUserId: user.id,
			orgId: org.id,
			role,
		};
	}

	async function addUserMembership(
		params: {
			orgId: string;
			label: string;
			role: "OWNER" | "ADMIN" | "MEMBER";
		}
	) {
		const nonce = randomUUID();
		const user = await prisma.user.create({
			data: {
				clerkUserId: `clerk_${params.label}_${nonce}`,
				email: `${params.label}-${nonce}@example.test`,
				name: `${params.label} user`,
				memberships: {
					create: {
						organizationId: params.orgId,
						role: params.role,
					},
				},
			},
			select: { id: true },
		});
		createdUserIds.add(user.id);

		return {
			dbUserId: user.id,
			orgId: params.orgId,
			role: params.role,
		};
	}

	it("isolates projects by org and excludes soft-deleted records", async () => {
		const tenantA = await seedTenant("tenant-a");
		const tenantB = await seedTenant("tenant-b");

		const aProject = await service.createProject(tenantA, {
			name: "Alpha Project",
			description: "A-only",
		});
		const bProject = await service.createProject(tenantB, {
			name: "Beta Project",
		});

		const projectsA = await service.listProjects({ orgId: tenantA.orgId });
		const projectsB = await service.listProjects({ orgId: tenantB.orgId });

		expect(projectsA.map((p) => p.id)).toContain(aProject.id);
		expect(projectsA.map((p) => p.id)).not.toContain(bProject.id);
		expect(projectsB.map((p) => p.id)).toContain(bProject.id);
		expect(projectsB.map((p) => p.id)).not.toContain(aProject.id);

		await service.softDeleteProject(tenantA, { projectId: aProject.id });

		const projectsAAfterDelete = await service.listProjects({ orgId: tenantA.orgId });
		expect(projectsAAfterDelete.map((p) => p.id)).not.toContain(aProject.id);

		const deletedRow = await prisma.project.findUnique({
			where: { id: aProject.id },
			select: { deletedAt: true },
		});
		expect(deletedRow?.deletedAt).toBeTruthy();
	});

	it("writes audit logs for project create, update, and delete", async () => {
		const tenant = await seedTenant("audit");

		const project = await service.createProject(tenant, {
			name: "Tracked Project",
			description: "Initial",
		});

		await service.updateProject(tenant, {
			projectId: project.id,
			name: "Tracked Project v2",
			description: "Updated",
		});

		await service.softDeleteProject(tenant, { projectId: project.id });

		const logs = await prisma.auditLog.findMany({
			where: {
				organizationId: tenant.orgId,
				targetType: "Project",
				targetId: project.id,
			},
			orderBy: [{ createdAt: "asc" }],
			select: { action: true, metadata: true },
		});

		expect(logs.map((l) => l.action)).toEqual([
			"project.create",
			"project.update",
			"project.delete",
		]);
		expect(logs[0]?.metadata).toMatchObject({ name: "Tracked Project" });
		expect(logs[1]?.metadata).toMatchObject({ name: "Tracked Project v2" });
		expect(logs[2]?.metadata).toMatchObject({ name: "Tracked Project v2" });
	});

	it("rejects cross-tenant update/delete attempts", async () => {
		const tenantA = await seedTenant("cross-a");
		const tenantB = await seedTenant("cross-b");

		const project = await service.createProject(tenantA, { name: "A Project" });

		await expect(
			service.updateProject(tenantB, {
				projectId: project.id,
				name: "Illegal Update",
			})
		).rejects.toThrow("NOT_FOUND");

		await expect(
			service.softDeleteProject(tenantB, { projectId: project.id })
		).rejects.toThrow("NOT_FOUND");
	});

	it("enforces RBAC for project mutations (MEMBER forbidden, ADMIN allowed)", async () => {
		const owner = await seedTenant("rbac-owner", "OWNER");
		const member = await addUserMembership({
			orgId: owner.orgId,
			label: "rbac-member",
			role: "MEMBER",
		});

		const ownerProject = await service.createProject(owner, {
			name: "Owner Created",
		});

		await expect(
			service.createProject(member, { name: "Member Create" })
		).rejects.toThrow("FORBIDDEN");
		await expect(
			service.updateProject(member, {
				projectId: ownerProject.id,
				name: "Member Update",
			})
		).rejects.toThrow("FORBIDDEN");
		await expect(
			service.softDeleteProject(member, { projectId: ownerProject.id })
		).rejects.toThrow("FORBIDDEN");

		const admin = await seedTenant("rbac-admin", "ADMIN");
		const adminProject = await service.createProject(admin, {
			name: "Admin Created",
		});

		const updatedAdminProject = await service.updateProject(admin, {
			projectId: adminProject.id,
			name: "Admin Updated",
		});
		expect(updatedAdminProject.name).toBe("Admin Updated");

		await expect(
			service.softDeleteProject(admin, { projectId: adminProject.id })
		).resolves.toBeUndefined();
	});
});
