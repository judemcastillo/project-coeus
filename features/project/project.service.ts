import { prisma } from "@/lib/prisma";

type ProjectActorCtx = {
	orgId: string;
	dbUserId: string;
};

export async function listProjects(params: { orgId: string }) {
	return prisma.project.findMany({
		where: {
			organizationId: params.orgId,
			deletedAt: null,
		},
		orderBy: [{ createdAt: "desc" }],
		select: {
			id: true,
			name: true,
			description: true,
			createdAt: true,
			updatedAt: true,
		},
	});
}

export async function createProject(
	ctx: ProjectActorCtx,
	input: { name: string; description?: string | null }
) {
	const name = input.name.trim();
	const description = input.description?.trim() || null;

	return prisma.$transaction(async (tx) => {
		const project = await tx.project.create({
			data: {
				organizationId: ctx.orgId,
				name,
				description,
			},
			select: {
				id: true,
				name: true,
				description: true,
			},
		});

		await tx.auditLog.create({
			data: {
				organizationId: ctx.orgId,
				actorUserId: ctx.dbUserId,
				action: "project.create",
				targetType: "Project",
				targetId: project.id,
				metadata: { name: project.name },
			},
		});

		return project;
	});
}

export async function updateProject(
	ctx: ProjectActorCtx,
	input: { projectId: string; name: string; description?: string | null }
) {
	const name = input.name.trim();
	const description = input.description?.trim() || null;

	return prisma.$transaction(async (tx) => {
		const existing = await tx.project.findFirst({
			where: {
				id: input.projectId,
				organizationId: ctx.orgId,
				deletedAt: null,
			},
			select: { id: true },
		});
		if (!existing) throw new Error("NOT_FOUND");

		const project = await tx.project.update({
			where: { id: input.projectId },
			data: { name, description },
			select: {
				id: true,
				name: true,
				description: true,
			},
		});

		await tx.auditLog.create({
			data: {
				organizationId: ctx.orgId,
				actorUserId: ctx.dbUserId,
				action: "project.update",
				targetType: "Project",
				targetId: project.id,
				metadata: { name: project.name },
			},
		});

		return project;
	});
}

export async function softDeleteProject(
	ctx: ProjectActorCtx,
	input: { projectId: string }
) {
	return prisma.$transaction(async (tx) => {
		const existing = await tx.project.findFirst({
			where: {
				id: input.projectId,
				organizationId: ctx.orgId,
				deletedAt: null,
			},
			select: { id: true, name: true },
		});
		if (!existing) throw new Error("NOT_FOUND");

		await tx.project.update({
			where: { id: input.projectId },
			data: { deletedAt: new Date() },
		});

		await tx.auditLog.create({
			data: {
				organizationId: ctx.orgId,
				actorUserId: ctx.dbUserId,
				action: "project.delete",
				targetType: "Project",
				targetId: existing.id,
				metadata: { name: existing.name },
			},
		});
	});
}
