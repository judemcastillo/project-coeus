import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/features/auth/rbac";
import type { TenantCtx } from "@/features/auth/ctx";

type TaskActorCtx = Pick<TenantCtx, "orgId" | "dbUserId" | "role">;
type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
type TaskStatus = "INPROGRESS" | "DONE" | "ONHOLD";

export async function listTasks(params: { orgId: string; projectId?: string }) {
	return prisma.task.findMany({
		where: {
			organizationId: params.orgId,
			deletedAt: null,
			...(params.projectId ? { projectId: params.projectId } : {}),
		},
		orderBy: [{ createdAt: "desc" }],
		select: {
			id: true,
			projectId: true,
			title: true,
			description: true,
			priority: true,
			status: true,
			createdAt: true,
			updatedAt: true,
			project: {
				select: {
					id: true,
					name: true,
				},
			},
		},
	});
}

export async function createTask(
	ctx: TaskActorCtx,
	input: {
		projectId: string;
		title: string;
		description?: string | null;
		priority?: TaskPriority | null;
		status?: TaskStatus;
	}
) {
	requireAdmin(ctx);

	const title = input.title.trim();
	const description = input.description?.trim() || null;
	const priority = input.priority ?? null;
	const status = input.status ?? "INPROGRESS";

	return prisma.$transaction(async (tx) => {
		const project = await tx.project.findFirst({
			where: {
				id: input.projectId,
				organizationId: ctx.orgId,
				deletedAt: null,
			},
			select: { id: true, name: true },
		});
		if (!project) throw new Error("NOT_FOUND");

		const task = await tx.task.create({
			data: {
				organizationId: ctx.orgId,
				projectId: project.id,
				title,
				description,
				priority,
				status,
			},
			select: {
				id: true,
				title: true,
				priority: true,
				status: true,
				projectId: true,
			},
		});

		await tx.auditLog.create({
			data: {
				organizationId: ctx.orgId,
				actorUserId: ctx.dbUserId,
				action: "task.create",
				targetType: "Task",
				targetId: task.id,
					metadata: {
						title: task.title,
						priority: task.priority,
						status: task.status,
						projectId: task.projectId,
						projectName: project.name,
				},
			},
		});

		return task;
	});
}

export async function updateTask(
	ctx: TaskActorCtx,
	input: {
		taskId: string;
		title: string;
		description?: string | null;
		priority?: TaskPriority | null;
		status?: TaskStatus;
	}
) {
	requireAdmin(ctx);

	const title = input.title.trim();
	const description = input.description?.trim() || null;
	const priority = input.priority ?? null;
	const status = input.status ?? "INPROGRESS";

	return prisma.$transaction(async (tx) => {
		const existing = await tx.task.findFirst({
			where: {
				id: input.taskId,
				organizationId: ctx.orgId,
				deletedAt: null,
			},
			select: { id: true },
		});
		if (!existing) throw new Error("NOT_FOUND");

		const task = await tx.task.update({
			where: { id: input.taskId },
			data: {
					title,
					description,
					priority,
					status,
				},
				select: {
					id: true,
					title: true,
					priority: true,
					status: true,
				},
		});

		await tx.auditLog.create({
			data: {
				organizationId: ctx.orgId,
				actorUserId: ctx.dbUserId,
				action: "task.update",
				targetType: "Task",
				targetId: task.id,
					metadata: {
						title: task.title,
						priority: task.priority,
						status: task.status,
					},
			},
		});

		return task;
	});
}

export async function softDeleteTask(ctx: TaskActorCtx, input: { taskId: string }) {
	requireAdmin(ctx);

	return prisma.$transaction(async (tx) => {
		const existing = await tx.task.findFirst({
			where: {
				id: input.taskId,
				organizationId: ctx.orgId,
				deletedAt: null,
			},
			select: {
				id: true,
					title: true,
					priority: true,
					status: true,
				},
		});
		if (!existing) throw new Error("NOT_FOUND");

		await tx.task.update({
			where: { id: input.taskId },
			data: { deletedAt: new Date() },
		});

		await tx.auditLog.create({
			data: {
				organizationId: ctx.orgId,
				actorUserId: ctx.dbUserId,
				action: "task.delete",
				targetType: "Task",
				targetId: existing.id,
					metadata: {
						title: existing.title,
						priority: existing.priority,
						status: existing.status,
					},
			},
		});
	});
}
