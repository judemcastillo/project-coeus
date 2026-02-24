import { prisma } from "@/lib/prisma";

export async function listOrgMembershipsForUser(params: { dbUserId: string }) {
	return prisma.membership.findMany({
		where: { userId: params.dbUserId },
		select: {
			organizationId: true,
			role: true,
			organization: {
				select: {
					name: true,
					plan: true,
				},
			},
		},
		orderBy: [{ createdAt: "asc" }],
	});
}

export async function hasOrgMembership(params: {
	dbUserId: string;
	orgId: string;
}) {
	const membership = await prisma.membership.findUnique({
		where: {
			userId_organizationId: {
				userId: params.dbUserId,
				organizationId: params.orgId,
			},
		},
		select: { id: true },
	});

	return Boolean(membership);
}
