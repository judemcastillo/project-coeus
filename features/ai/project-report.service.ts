import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/features/auth/rbac";
import { assertAiRequestWithinLimit, getAiRequestLimitForPlan, monthPeriod } from "@/features/usage/usage.service";
import type { TenantCtx } from "@/features/auth/ctx";
import { generateAiText } from "@/features/ai/provider";

type AiActorCtx = Pick<TenantCtx, "dbUserId" | "orgId" | "role" | "org">;

type ReportProject = {
	id: string;
	name: string;
	description: string | null;
	updatedAt: Date;
	createdAt: Date;
};

function estimateTokens(text: string) {
	return Math.max(1, Math.ceil(text.length / 4));
}

function buildProjectStatusReport(project: ReportProject) {
	const summary = project.description?.trim()
		? project.description.trim()
		: "No project description provided yet.";

	return [
		`Project Status Report: ${project.name}`,
		"",
		"Current Summary",
		summary,
		"",
		"Status Assessment",
		"- Scope is defined at a high level and ready for team review.",
		"- Recommended next step: confirm owners, milestones, and delivery date.",
		`- Last project update recorded: ${project.updatedAt.toLocaleString()}.`,
		"",
		"Suggested Immediate Actions",
		"1. Confirm success criteria for the next milestone.",
		"2. Break work into 2-5 concrete deliverables.",
		"3. Track risks/blockers weekly and update status notes.",
	].join("\n");
}

function buildProjectReportPrompt(project: ReportProject) {
	return [
		"Generate a concise project status report for an internal SaaS team.",
		"Use clear sections and practical next steps.",
		"",
		`Project name: ${project.name}`,
		`Project description: ${project.description ?? "None provided"}`,
		`Created at: ${project.createdAt.toISOString()}`,
		`Updated at: ${project.updatedAt.toISOString()}`,
	].join("\n");
}

function parseReportMetadata(metadata: unknown) {
	if (!metadata || typeof metadata !== "object") return null;
	const value = metadata as Record<string, unknown>;
	if (typeof value.output !== "string") return null;

	return {
		projectId: typeof value.projectId === "string" ? value.projectId : null,
		projectName: typeof value.projectName === "string" ? value.projectName : null,
		model: typeof value.model === "string" ? value.model : null,
		output: value.output,
	};
}

export async function listProjectReportHistory(params: { orgId: string; limit?: number }) {
	const logs = await prisma.auditLog.findMany({
		where: {
			organizationId: params.orgId,
			action: "ai.project_report.generate",
			targetType: "Project",
		},
		orderBy: [{ createdAt: "desc" }],
		take: params.limit ?? 10,
		select: {
			id: true,
			targetId: true,
			createdAt: true,
			metadata: true,
			actor: {
				select: {
					name: true,
					email: true,
				},
			},
		},
	});

	return logs
		.map((log) => {
			const parsed = parseReportMetadata(log.metadata);
			if (!parsed) return null;
			return {
				id: log.id,
				projectId: parsed.projectId ?? log.targetId ?? "",
				projectName: parsed.projectName ?? "Unknown project",
				model: parsed.model ?? "unknown",
				output: parsed.output,
				createdAt: log.createdAt,
				actorName: log.actor?.name || log.actor?.email || "Unknown user",
			};
		})
		.filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export async function generateProjectStatusReport(
	ctx: AiActorCtx,
	input: { projectId: string }
) {
	requireAdmin(ctx);
	await assertAiRequestWithinLimit(ctx);

	const project = await prisma.project.findFirst({
		where: {
			id: input.projectId,
			organizationId: ctx.orgId,
			deletedAt: null,
		},
		select: {
			id: true,
			name: true,
			description: true,
			createdAt: true,
			updatedAt: true,
		},
	});
	if (!project) throw new Error("NOT_FOUND");

	// Placeholder model call for Milestone 8 scaffolding. Swap with provider call later.
	const fallbackOutput = buildProjectStatusReport(project);
	const providerResult = await generateAiText({
		prompt: buildProjectReportPrompt(project),
		systemInstruction:
			"You generate practical project status reports for internal product teams.",
		fallbackText: fallbackOutput,
	});
	const output = providerResult.text;
	const model = providerResult.model;
	const tokensIn =
		providerResult.tokensIn ?? estimateTokens(`${project.name}\n${project.description ?? ""}`);
	const tokensOut = providerResult.tokensOut ?? estimateTokens(output);
	const totalTokens = tokensIn + tokensOut;
	const now = new Date();

	return prisma.$transaction(async (tx) => {
		let usage = await tx.usage.findUnique({
			where: { organizationId: ctx.orgId },
			select: {
				id: true,
				aiRequestsCount: true,
				tokensUsed: true,
				periodStart: true,
				periodEnd: true,
			},
		});
		if (!usage) throw new Error("USAGE_NOT_FOUND");

		if (now.getTime() >= usage.periodEnd.getTime()) {
			const { start, end } = monthPeriod(now);
			usage = await tx.usage.update({
				where: { id: usage.id },
				data: {
					periodStart: start,
					periodEnd: end,
					aiRequestsCount: 0,
					tokensUsed: 0,
				},
				select: {
					id: true,
					aiRequestsCount: true,
					tokensUsed: true,
					periodStart: true,
					periodEnd: true,
				},
			});
		}

		const limit = getAiRequestLimitForPlan(ctx.org.plan);
		if (usage.aiRequestsCount >= limit) {
			throw new Error("USAGE_LIMIT_EXCEEDED");
		}

		const aiRequest = await tx.aIRequest.create({
			data: {
				organizationId: ctx.orgId,
				userId: ctx.dbUserId,
				feature: "project_report",
				model,
				tokensIn,
				tokensOut,
			},
			select: {
				id: true,
				model: true,
				tokensIn: true,
				tokensOut: true,
				createdAt: true,
			},
		});

		const updatedUsage = await tx.usage.update({
			where: { id: usage.id },
			data: {
				aiRequestsCount: { increment: 1 },
				tokensUsed: { increment: totalTokens },
			},
			select: {
				aiRequestsCount: true,
				tokensUsed: true,
				periodStart: true,
				periodEnd: true,
			},
		});

		await tx.auditLog.create({
			data: {
				organizationId: ctx.orgId,
				actorUserId: ctx.dbUserId,
				action: "ai.project_report.generate",
				targetType: "Project",
				targetId: project.id,
				metadata: {
					projectId: project.id,
					projectName: project.name,
					model,
					aiRequestId: aiRequest.id,
					tokensIn,
					tokensOut,
					output,
				},
			},
		});

		return {
			project: {
				id: project.id,
				name: project.name,
			},
			report: {
				output,
				model,
			},
			aiRequest,
			usage: updatedUsage,
		};
	});
}
