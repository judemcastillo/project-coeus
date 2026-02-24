import { prisma } from "@/lib/prisma";
import { getDbUser } from "./getDbUser";
import { requireAuth } from "./requireAuth";
import { getActiveOrgId } from "./tenant";
import { redirect } from "next/navigation";

export type TenantCtx = {
	dbUserId: string;
	orgId: string;
	role: "OWNER" | "ADMIN" | "MEMBER";
	org: {
		name: string;
		plan: "FREE" | "PRO";
	};
};

type GetTenantCtxOptions = {
	authRedirectTo?: string;
};

export async function getTenantCtx(
	options?: GetTenantCtxOptions
): Promise<TenantCtx> {
	await requireAuth(options?.authRedirectTo ?? "/dashboard");
	const dbUser = await getDbUser();
	const dbUserId = dbUser.id;

	const orgId = await getActiveOrgId();
	if (!orgId) redirect("/onboarding");

	const membership = await prisma.membership.findUnique({
		where: { userId_organizationId: { userId: dbUserId, organizationId: orgId } },
		select: {
			role: true,
			organization: { select: { name: true, plan: true } },
		},
	});

	if (!membership) redirect("/onboarding/recover-active-org");

	return {
		dbUserId,
		orgId,
		role: membership.role,
		org: membership.organization,
	};
}

// Backward-compatible alias while tenant-context naming is rolled out.
export type Ctx = TenantCtx;
export const getCtx = getTenantCtx;
