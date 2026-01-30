import { prisma } from "@/lib/prisma";
import { setActiveOrgId } from "@/features/auth/tenant";

function monthPeriod(now = new Date()) {
	const start = new Date(now.getFullYear(), now.getMonth(), 1);
	const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
	return { start, end };
}

export async function createOrganizationForUser(params: {
	userId: string;
	orgName: string;
}) {
	const { userId, orgName } = params;

	const { start, end } = monthPeriod();

	const org = await prisma.organization.create({
		data: {
			name: orgName,
			memberships: {
				create: { userId, role: "OWNER" },
			},
			usage: {
				create: {
					periodStart: start,
					periodEnd: end,
				},
			},
			auditLogs: {
				create: {
					actorUserId: userId,
					action: "org.create",
					targetType: "Organization",
					// targetId filled after create isn't automatic here; keep it simple for now
					metadata: { name: orgName },
				},
			},
		},
		select: { id: true, name: true },
	});

	await setActiveOrgId(org.id);
	return org;
}
