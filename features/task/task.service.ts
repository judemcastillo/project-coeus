import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/features/auth/rbac";
import type { TenantCtx } from "@/features/auth/ctx";

type TaskActorCtx = Pick<TenantCtx, "orgId" | "dbUserId" | "role">;
type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
type TaskStatus = "INPROGRESS" | "DONE" | "ONHOLD";

async function resolveAssignee(
	tx: {
		membership: {
			findUnique: typeof prisma.membership.findUnique;
		};
	},
	orgId: string,
	assigneeUserId?: string | null
) {
	if (!assigneeUserId) return null;

	const membership = await tx.membership.findUnique({
		where: {
			userId_organizationId: {
				userId: assigneeUserId,
				organizationId: orgId,
			},
		},
		select: { userId: true },
	});
	if (!membership) throw new Error("ASSIGNEE_NOT_FOUND");
	return membership.userId;
}

export async function listTasks(params: { orgId: string; projectId?: string }) {
	const tasks = await prisma.task.findMany({
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
			parentTaskId: true,
			project: {
				select: {
					id: true,
					name: true,
				},
			},
			creator: {
				select: {
					id: true,
					name: true,
					email: true,
				},
			},
			assignee: {
				select: {
					id: true,
					name: true,
					email: true,
				},
			},
			subtasks: {
				where: { deletedAt: null },
				orderBy: [{ createdAt: "asc" }],
				select: {
					id: true,
					title: true,
					status: true,
				},
			},
			comments: {
				orderBy: [{ createdAt: "asc" }],
				select: {
					id: true,
					content: true,
					createdAt: true,
					user: {
						select: {
							name: true,
							email: true,
						},
					},
				},
			},
		},
	});

	const taskIds = tasks.map((task) => task.id);
	const activityLogs =
		taskIds.length === 0
			? []
			: await prisma.auditLog.findMany({
					where: {
						organizationId: params.orgId,
						targetType: "Task",
						targetId: { in: taskIds },
						action: {
							in: [
								"task.create",
								"task.update",
								"task.delete",
								"task.comment.add",
								"task.subtask.create",
							],
						},
					},
					orderBy: [{ createdAt: "desc" }],
					select: {
						id: true,
						targetId: true,
						action: true,
						createdAt: true,
						metadata: true,
						actor: {
							select: {
								name: true,
								email: true,
							},
						},
					},
			  });

	const activityByTask = new Map<string, Array<{
		id: string;
		action: string;
		createdAt: Date;
		actorName: string;
	}>>();

	for (const log of activityLogs) {
		if (!log.targetId) continue;
		const existing = activityByTask.get(log.targetId) ?? [];
		existing.push({
			id: log.id,
			action: log.action,
			createdAt: log.createdAt,
			actorName: log.actor?.name || log.actor?.email || "Unknown user",
		});
		activityByTask.set(log.targetId, existing.slice(0, 10));
	}

	return tasks.map((task) => ({
		...task,
		activity: activityByTask.get(task.id) ?? [],
	}));
}

export async function createTask(
	ctx: TaskActorCtx,
	input: {
		projectId: string;
		title: string;
		description?: string | null;
		priority?: TaskPriority | null;
		status?: TaskStatus;
		assigneeUserId?: string | null;
		parentTaskId?: string | null;
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

		if (input.parentTaskId) {
			const parentTask = await tx.task.findFirst({
				where: {
					id: input.parentTaskId,
					organizationId: ctx.orgId,
					projectId: input.projectId,
					deletedAt: null,
				},
				select: { id: true },
			});
			if (!parentTask) throw new Error("PARENT_TASK_NOT_FOUND");
		}

		const assigneeUserId = await resolveAssignee(
			tx,
			ctx.orgId,
			input.assigneeUserId
		);

		const task = await tx.task.create({
			data: {
				organizationId: ctx.orgId,
				projectId: project.id,
				creatorUserId: ctx.dbUserId,
				assigneeUserId,
				parentTaskId: input.parentTaskId ?? null,
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
				creatorUserId: true,
				assigneeUserId: true,
				parentTaskId: true,
			},
		});

		await tx.auditLog.create({
			data: {
				organizationId: ctx.orgId,
				actorUserId: ctx.dbUserId,
				action: task.parentTaskId ? "task.subtask.create" : "task.create",
				targetType: "Task",
				targetId: task.parentTaskId ?? task.id,
				metadata: {
					taskId: task.id,
					title: task.title,
					priority: task.priority,
					status: task.status,
					projectId: task.projectId,
					projectName: project.name,
					creatorUserId: task.creatorUserId,
					assigneeUserId: task.assigneeUserId,
					parentTaskId: task.parentTaskId,
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
		assigneeUserId?: string | null;
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

		const assigneeUserId = await resolveAssignee(
			tx,
			ctx.orgId,
			input.assigneeUserId
		);

		const task = await tx.task.update({
			where: { id: input.taskId },
			data: {
				title,
				description,
				priority,
				status,
				assigneeUserId,
			},
			select: {
				id: true,
				title: true,
				priority: true,
				status: true,
				assigneeUserId: true,
				parentTaskId: true,
			},
		});

		await tx.auditLog.create({
			data: {
				organizationId: ctx.orgId,
				actorUserId: ctx.dbUserId,
				action: "task.update",
				targetType: "Task",
				targetId: task.parentTaskId ?? task.id,
				metadata: {
					taskId: task.id,
					title: task.title,
					priority: task.priority,
					status: task.status,
					assigneeUserId: task.assigneeUserId,
				},
			},
		});

		return task;
	});
}

export async function addTaskComment(
	ctx: TaskActorCtx,
	input: { taskId: string; content: string }
) {
	const content = input.content.trim();

	return prisma.$transaction(async (tx) => {
		const task = await tx.task.findFirst({
			where: {
				id: input.taskId,
				organizationId: ctx.orgId,
				deletedAt: null,
			},
			select: { id: true, parentTaskId: true },
		});
		if (!task) throw new Error("NOT_FOUND");

		const comment = await tx.taskComment.create({
			data: {
				organizationId: ctx.orgId,
				taskId: task.id,
				userId: ctx.dbUserId,
				content,
			},
			select: {
				id: true,
				content: true,
				createdAt: true,
			},
		});

		await tx.auditLog.create({
			data: {
				organizationId: ctx.orgId,
				actorUserId: ctx.dbUserId,
				action: "task.comment.add",
				targetType: "Task",
				targetId: task.parentTaskId ?? task.id,
				metadata: {
					taskId: task.id,
					commentId: comment.id,
					preview: content.slice(0, 120),
				},
			},
		});

		return comment;
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
				parentTaskId: true,
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
				targetId: existing.parentTaskId ?? existing.id,
				metadata: {
					taskId: existing.id,
					title: existing.title,
					priority: existing.priority,
					status: existing.status,
				},
			},
		});
	});
}
