import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveOrgId } from "./tenant";

export type Ctx = {
	userId: string;
	orgId: string;
	role: "OWNER" | "ADMIN" | "MEMBER";
};

export async function getCtx(): Promise<Ctx> {
	const session = await auth();
	const userId = session?.user?.id;
	if (!userId) throw new Error("UNAUTHORIZED");

	const orgId =  await getActiveOrgId();
	if (!orgId) throw new Error("NO_ACTIVE_ORG");

	const membership = await prisma.membership.findUnique({
		where: { userId_organizationId: { userId, organizationId: orgId } },
		select: { role: true },
	});

	if (!membership) throw new Error("FORBIDDEN");

	return { userId, orgId, role: membership.role };
}
