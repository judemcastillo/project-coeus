"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { getDbUser } from "@/features/auth/getDbUser";
import { createOrgForUser } from "@/features/org/org.service";

const schema = z.object({
	orgName: z.string().min(2).max(60),
});

export async function createOrgAction(formData: FormData) {
	const { orgName } = schema.parse({ orgName: formData.get("orgName") });
	const dbUser = await getDbUser();

	await createOrgForUser({ userId: dbUser.id, name: orgName });
	redirect("/dashboard");
}
