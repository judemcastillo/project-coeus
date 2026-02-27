"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTenantCtx } from "@/features/auth/ctx";
import { requireAdmin } from "@/features/auth/rbac";
import { generateProjectStatusReport } from "@/features/ai/project-report.service";

const generateProjectReportSchema = z.object({
	projectId: z.string().min(1),
});

export async function generateProjectReportAction(formData: FormData) {
	const ctx = await getTenantCtx({ authRedirectTo: "/ai/project-report" });
	requireAdmin(ctx);

	const { projectId } = generateProjectReportSchema.parse({
		projectId: formData.get("projectId"),
	});

	try {
		await generateProjectStatusReport(ctx, { projectId });
	} catch (error) {
		if (error instanceof Error && error.message === "USAGE_LIMIT_EXCEEDED") {
			redirect("/ai/project-report?error=usage-limit");
		}
		if (error instanceof Error && error.message === "NOT_FOUND") {
			redirect("/ai/project-report?error=project-not-found");
		}
		if (error instanceof Error && error.message.startsWith("AI_PROVIDER_ERROR")) {
			redirect("/ai/project-report?error=provider");
		}
		throw error;
	}

	revalidatePath("/ai/project-report");
	revalidatePath("/settings/usage");
	redirect("/ai/project-report?result=success");
}
