"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTenantCtx } from "@/features/auth/ctx";
import { requireAdmin } from "@/features/auth/rbac";
import {
	assertAiRequestWithinLimit,
	incrementAiUsage,
} from "@/features/usage/usage.service";

const simulateUsageSchema = z.object({
	tokensUsed: z.coerce.number().int().min(0).max(1_000_000).default(0),
});

export async function simulateAiUsageAction(formData: FormData) {
	const ctx = await getTenantCtx({ authRedirectTo: "/settings/usage/test" });
	requireAdmin(ctx);

	const { tokensUsed } = simulateUsageSchema.parse({
		tokensUsed: formData.get("tokensUsed") ?? 0,
	});

	try {
		await assertAiRequestWithinLimit(ctx);
		await incrementAiUsage({ orgId: ctx.orgId, tokensUsed });
	} catch (error) {
		if (error instanceof Error && error.message === "USAGE_LIMIT_EXCEEDED") {
			redirect("/settings/usage/test?result=limit-exceeded");
		}
		throw error;
	}

	revalidatePath("/settings/usage");
	revalidatePath("/settings/usage/test");
	redirect("/settings/usage/test?result=success");
}
