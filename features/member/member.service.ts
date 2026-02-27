import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/features/auth/rbac";
import type { TenantCtx } from "@/features/auth/ctx";

type MemberActorCtx = Pick<TenantCtx, "orgId" | "dbUserId" | "role">;
type OrgRole = TenantCtx["role"];

export async function listMembers(params: { orgId: string }) {
	return prisma.membership.findMany({
		where: { organizationId: params.orgId },
		orderBy: [{ createdAt: "asc" }],
		select: {
			id: true,
			role: true,
			createdAt: true,
			userId: true,
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					image: true,
				},
			},
		},
	});
}

export async function addMemberToOrgByEmail(
	ctx: MemberActorCtx,
	input: { email: string; role: OrgRole }
) {
	requireOwner(ctx);

	const email = input.email.trim().toLowerCase();

	return prisma.$transaction(async (tx) => {
		const user = await tx.user.findFirst({
			where: {
				email: {
					equals: email,
					mode: "insensitive",
				},
			},
			select: { id: true, email: true },
		});
		if (!user) throw new Error("USER_NOT_FOUND");

		const existing = await tx.membership.findUnique({
			where: {
				userId_organizationId: {
					userId: user.id,
					organizationId: ctx.orgId,
				},
			},
			select: { id: true },
		});
		if (existing) throw new Error("ALREADY_MEMBER");

		const membership = await tx.membership.create({
			data: {
				userId: user.id,
				organizationId: ctx.orgId,
				role: input.role,
			},
			select: {
				id: true,
				role: true,
				userId: true,
			},
		});

		await tx.auditLog.create({
			data: {
				organizationId: ctx.orgId,
				actorUserId: ctx.dbUserId,
				action: "membership.add",
				targetType: "Membership",
				targetId: membership.id,
				metadata: { userId: membership.userId, role: membership.role, email: user.email },
			},
		});

		return membership;
	});
}

export async function changeMemberRole(
	ctx: MemberActorCtx,
	input: { membershipId: string; role: OrgRole }
) {
	requireOwner(ctx);

	return prisma.$transaction(async (tx) => {
		const membership = await tx.membership.findFirst({
			where: {
				id: input.membershipId,
				organizationId: ctx.orgId,
			},
			select: {
				id: true,
				role: true,
				userId: true,
			},
		});
		if (!membership) throw new Error("NOT_FOUND");

		if (membership.role === input.role) {
			return membership;
		}

		if (membership.role === "OWNER" && input.role !== "OWNER") {
			const ownerCount = await tx.membership.count({
				where: {
					organizationId: ctx.orgId,
					role: "OWNER",
				},
			});
			if (ownerCount <= 1) throw new Error("LAST_OWNER");
		}

		const updated = await tx.membership.update({
			where: { id: membership.id },
			data: { role: input.role },
			select: {
				id: true,
				role: true,
				userId: true,
			},
		});

		await tx.auditLog.create({
			data: {
				organizationId: ctx.orgId,
				actorUserId: ctx.dbUserId,
				action: "membership.role_update",
				targetType: "Membership",
				targetId: updated.id,
				metadata: {
					userId: updated.userId,
					fromRole: membership.role,
					toRole: updated.role,
				},
			},
		});

		return updated;
	});
}
