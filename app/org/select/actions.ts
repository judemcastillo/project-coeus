"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { requireAuth } from "@/features/auth/requireAuth";
import { getDbUser } from "@/features/auth/getDbUser";
import { hasOrgMembership } from "@/features/tenant/membership";
import { setActiveOrgId } from "@/features/tenant/activeOrg";

const schema = z.object({
	orgId: z.string().min(1),
});

export async function selectOrgAction(formData: FormData) {
	await requireAuth("/org/select");
	const { orgId } = schema.parse({ orgId: formData.get("orgId") });
	const dbUser = await getDbUser();

	const allowed = await hasOrgMembership({ dbUserId: dbUser.id, orgId });
	if (!allowed) {
		throw new Error("FORBIDDEN");
	}

	await setActiveOrgId(orgId);
	redirect("/dashboard");
}
