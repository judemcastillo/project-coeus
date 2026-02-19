import { prisma } from "@/lib/prisma";
import { setActiveOrgId } from "@/features/tenant/activeOrg";

function monthPeriod(now = new Date()) {
	const start = new Date(now.getFullYear(), now.getMonth(), 1);
	const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
	return { start, end };
}

export async function createOrgForUser(params: {
	userId: string;
	name: string;
}) {
	const { userId, name } = params;
	const { start, end } = monthPeriod();

	const org = await prisma.organization.create({
		data: {
			name,
			memberships: { create: { userId, role: "OWNER" } },
			usage: { create: { periodStart: start, periodEnd: end } },
			auditLogs: {
				create: {
					actorUserId: userId,
					action: "org.create",
					targetType: "Organization",
					metadata: { name },
				},
			},
		},
		select: { id: true, name: true },
	});

	await setActiveOrgId(org.id);
	return org;
}
