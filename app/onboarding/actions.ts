"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { getDbUser } from "@/features/auth/getDbUser";
import { requireAuth } from "@/features/auth/requireAuth";
import { createOrgForUser } from "@/features/org/org.service";
import { setActiveOrgId } from "@/features/tenant/activeOrg";

const schema = z.object({
	orgName: z.string().trim().min(2).max(60),
});

export async function createOrgAction(formData: FormData) {
	await requireAuth("/onboarding");
	const { orgName } = schema.parse({ orgName: formData.get("orgName") });
	const dbUser = await getDbUser();

	const org = await createOrgForUser({ userId: dbUser.id, name: orgName });
	await setActiveOrgId(org.id);
	redirect("/dashboard");
}
