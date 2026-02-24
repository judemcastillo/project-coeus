import { prisma } from "@/lib/prisma";

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
