import { prisma } from "@/lib/prisma";
type DbUser = {
	id: string;
	createdAt: Date;
	name: string | null;
	updatedAt: Date;
	clerkUserId: string;
	email: string;
	image: string | null;
};
type OrgId = string;

export default async function getMembership(dbUser: DbUser, orgId: OrgId) {
	const membership = await prisma.membership.findUnique({
		where: {
			userId_organizationId: { userId: dbUser.id, organizationId: orgId },
		},
		select: {
			role: true,
			organization: { select: { name: true, plan: true } },
		},
	});

	return { membership };
}
