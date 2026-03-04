import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/features/auth/rbac";
import type { TenantCtx } from "@/features/auth/ctx";

function monthPeriod(now = new Date()) {
	const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
	const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
	return { start, end };
}

export async function createOrgForUser(params: {
	userId: string;
	name: string;
}) {
	const { userId, name } = params;
	const normalizedName = name.trim();
	const { start, end } = monthPeriod();

	const org = await prisma.organization.create({
		data: {
			name: normalizedName,
			memberships: { create: { userId, role: "OWNER" } },
			usage: { create: { periodStart: start, periodEnd: end } },
			auditLogs: {
				create: {
					actorUserId: userId,
					action: "org.create",
					targetType: "Organization",
					metadata: { name: normalizedName },
				},
			},
		},
		select: { id: true, name: true },
	});
	return org;
}

type OrgActorCtx = Pick<TenantCtx, "orgId" | "role">;

export async function deleteOrg(
	ctx: OrgActorCtx,
	input: { confirmName: string }
) {
	requireOwner(ctx);

	const organization = await prisma.organization.findUnique({
		where: { id: ctx.orgId },
		select: { id: true, name: true },
	});
	if (!organization) throw new Error("NOT_FOUND");

	if (organization.name.trim() !== input.confirmName.trim()) {
		throw new Error("CONFIRMATION_MISMATCH");
	}

	await prisma.organization.delete({
		where: { id: organization.id },
	});
}
