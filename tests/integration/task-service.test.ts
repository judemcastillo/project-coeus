import { randomUUID } from "node:crypto";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

const runIntegration = process.env.RUN_INTEGRATION_TESTS === "1";
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration("task.service (integration)", () => {
	let prisma: (typeof import("@/lib/prisma"))["prisma"];
	let service: typeof import("@/features/task/task.service");
	const createdOrgIds = new Set<string>();
	const createdUserIds = new Set<string>();

	beforeAll(async () => {
		if (!process.env.DATABASE_URL) {
			throw new Error("DATABASE_URL is required for integration tests");
		}

		delete (globalThis as { prisma?: unknown }).prisma;
		({ prisma } = await import("@/lib/prisma"));
		service = await import("@/features/task/task.service");
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
				projects: {
					create: { name: `${label} project` },
				},
			},
			select: { id: true, projects: { select: { id: true } } },
		});
		createdOrgIds.add(org.id);

		return {
			dbUserId: user.id,
			orgId: org.id,
			role,
			projectId: org.projects[0]!.id,
		};
	}

	async function addUserMembership(params: {
		orgId: string;
		label: string;
		role: "OWNER" | "ADMIN" | "MEMBER";
	}) {
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

	it("isolates tasks by org and excludes soft-deleted records", async () => {
		const tenantA = await seedTenant("task-a");
		const tenantB = await seedTenant("task-b");

		const aTask = await service.createTask(tenantA, {
			projectId: tenantA.projectId,
			title: "A Task",
			priority: "MEDIUM",
			status: "INPROGRESS",
		});
		const bTask = await service.createTask(tenantB, {
			projectId: tenantB.projectId,
			title: "B Task",
			status: "DONE",
		});

		const tasksA = await service.listTasks({ orgId: tenantA.orgId });
		const tasksB = await service.listTasks({ orgId: tenantB.orgId });

		expect(tasksA.map((t) => t.id)).toContain(aTask.id);
		expect(tasksA.map((t) => t.id)).not.toContain(bTask.id);
		expect(tasksB.map((t) => t.id)).toContain(bTask.id);
		expect(tasksB.map((t) => t.id)).not.toContain(aTask.id);

		await service.softDeleteTask(tenantA, { taskId: aTask.id });
		const tasksAAfterDelete = await service.listTasks({ orgId: tenantA.orgId });
		expect(tasksAAfterDelete.map((t) => t.id)).not.toContain(aTask.id);
	});

	it("writes audit logs for task create, update, and delete", async () => {
		const tenant = await seedTenant("task-audit");

		const task = await service.createTask(tenant, {
			projectId: tenant.projectId,
			title: "Tracked Task",
			priority: "LOW",
			status: "INPROGRESS",
		});

		await service.updateTask(tenant, {
			taskId: task.id,
			title: "Tracked Task v2",
			priority: "HIGH",
			status: "ONHOLD",
		});

		await service.softDeleteTask(tenant, { taskId: task.id });

		const logs = await prisma.auditLog.findMany({
			where: {
				organizationId: tenant.orgId,
				targetType: "Task",
				targetId: task.id,
			},
			orderBy: [{ createdAt: "asc" }],
			select: { action: true, metadata: true },
		});

		expect(logs.map((l) => l.action)).toEqual([
			"task.create",
			"task.update",
			"task.delete",
		]);
		expect(logs[0]?.metadata).toMatchObject({
			title: "Tracked Task",
			priority: "LOW",
			status: "INPROGRESS",
		});
		expect(logs[1]?.metadata).toMatchObject({
			title: "Tracked Task v2",
			priority: "HIGH",
			status: "ONHOLD",
		});
		expect(logs[2]?.metadata).toMatchObject({
			title: "Tracked Task v2",
			priority: "HIGH",
			status: "ONHOLD",
		});
	});

	it("rejects cross-tenant update/delete attempts", async () => {
		const tenantA = await seedTenant("task-cross-a");
		const tenantB = await seedTenant("task-cross-b");

		const task = await service.createTask(tenantA, {
			projectId: tenantA.projectId,
			title: "A Task",
		});

		await expect(
			service.updateTask(tenantB, {
				taskId: task.id,
				title: "Illegal update",
			})
		).rejects.toThrow("NOT_FOUND");

		await expect(
			service.softDeleteTask(tenantB, { taskId: task.id })
		).rejects.toThrow("NOT_FOUND");
	});

	it("enforces RBAC for task mutations and supports optional priority", async () => {
		const owner = await seedTenant("task-rbac-owner", "OWNER");
		const member = await addUserMembership({
			orgId: owner.orgId,
			label: "task-rbac-member",
			role: "MEMBER",
		});

		const task = await service.createTask(owner, {
			projectId: owner.projectId,
			title: "Owner task",
			priority: null,
			status: "DONE",
		});

		await expect(
			service.createTask(member, {
				projectId: owner.projectId,
				title: "Member create",
			})
		).rejects.toThrow("FORBIDDEN");
		await expect(
			service.updateTask(member, {
				taskId: task.id,
				title: "Member update",
			})
		).rejects.toThrow("FORBIDDEN");
		await expect(
			service.softDeleteTask(member, { taskId: task.id })
		).rejects.toThrow("FORBIDDEN");

		const created = await prisma.task.findUniqueOrThrow({
			where: { id: task.id },
			select: { priority: true, status: true },
		});
		expect(created.priority).toBeNull();
		expect(created.status).toBe("DONE");
	});
});
