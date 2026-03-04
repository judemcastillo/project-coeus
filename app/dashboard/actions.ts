"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { getTenantCtx } from "@/features/auth/ctx";
import { requireOwner } from "@/features/auth/rbac";
import { clearActiveOrgId } from "@/features/tenant/activeOrg";
import { deleteOrg } from "@/features/org/org.service";

const deleteOrgSchema = z.object({
	confirmName: z.string().trim().min(1).max(120),
});

export async function deleteOrgAction(formData: FormData) {
	const ctx = await getTenantCtx({ authRedirectTo: "/dashboard" });
	requireOwner(ctx);

	const parsed = deleteOrgSchema.safeParse({
		confirmName: formData.get("confirmName"),
	});
	if (!parsed.success) {
		redirect("/dashboard?error=invalid-org-confirmation");
	}

	try {
		await deleteOrg(ctx, { confirmName: parsed.data.confirmName });
	} catch (error) {
		if (error instanceof Error && error.message === "CONFIRMATION_MISMATCH") {
			redirect("/dashboard?error=org-name-mismatch");
		}
		if (error instanceof Error && error.message === "NOT_FOUND") {
			redirect("/dashboard?error=org-not-found");
		}
		throw error;
	}

	await clearActiveOrgId();
	redirect("/org/select/auto");
}
