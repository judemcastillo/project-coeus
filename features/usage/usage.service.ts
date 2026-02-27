import { prisma } from "@/lib/prisma";
import type { TenantCtx } from "@/features/auth/ctx";

type Plan = TenantCtx["org"]["plan"];

export const AI_REQUEST_LIMITS: Record<Plan, number> = {
	FREE: 25,
	PRO: 1000,
};

type UsageCtx = Pick<TenantCtx, "orgId" | "org">;

type UsageRecord = {
	id: string;
	organizationId: string;
	periodStart: Date;
	periodEnd: Date;
	aiRequestsCount: number;
	tokensUsed: number;
};

export function monthPeriod(now = new Date()) {
	const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
	const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
	return { start, end };
}

export function getAiRequestLimitForPlan(plan: Plan) {
	return AI_REQUEST_LIMITS[plan];
}

function isUsagePeriodStale(usage: Pick<UsageRecord, "periodEnd">, now: Date) {
	return now.getTime() >= usage.periodEnd.getTime();
}

async function ensureCurrentUsagePeriod(
	orgId: string,
	now = new Date()
): Promise<UsageRecord> {
	return prisma.$transaction(async (tx) => {
		const usage = await tx.usage.findUnique({
			where: { organizationId: orgId },
			select: {
				id: true,
				organizationId: true,
				periodStart: true,
				periodEnd: true,
				aiRequestsCount: true,
				tokensUsed: true,
			},
		});
		if (!usage) throw new Error("USAGE_NOT_FOUND");

		if (!isUsagePeriodStale(usage, now)) return usage;

		const { start, end } = monthPeriod(now);
		return tx.usage.update({
			where: { id: usage.id },
			data: {
				periodStart: start,
				periodEnd: end,
				aiRequestsCount: 0,
				tokensUsed: 0,
			},
			select: {
				id: true,
				organizationId: true,
				periodStart: true,
				periodEnd: true,
				aiRequestsCount: true,
				tokensUsed: true,
			},
		});
	});
}

export async function getUsageSummary(
	ctx: UsageCtx,
	options?: { now?: Date }
) {
	const usage = await ensureCurrentUsagePeriod(ctx.orgId, options?.now);
	const limit = getAiRequestLimitForPlan(ctx.org.plan);
	const used = usage.aiRequestsCount;

	return {
		plan: ctx.org.plan,
		periodStart: usage.periodStart,
		periodEnd: usage.periodEnd,
		aiRequests: {
			used,
			limit,
			remaining: Math.max(0, limit - used),
			isOverLimit: used >= limit,
		},
		tokensUsed: usage.tokensUsed,
	};
}

export async function assertAiRequestWithinLimit(
	ctx: UsageCtx,
	options?: { now?: Date }
) {
	const summary = await getUsageSummary(ctx, options);
	if (summary.aiRequests.used >= summary.aiRequests.limit) {
		throw new Error("USAGE_LIMIT_EXCEEDED");
	}
	return summary;
}

export async function incrementAiUsage(params: {
	orgId: string;
	tokensUsed?: number;
	now?: Date;
}) {
	const tokensToAdd = Math.max(0, params.tokensUsed ?? 0);
	const now = params.now ?? new Date();

	return prisma.$transaction(async (tx) => {
		const usage = await tx.usage.findUnique({
			where: { organizationId: params.orgId },
			select: {
				id: true,
				periodEnd: true,
			},
		});
		if (!usage) throw new Error("USAGE_NOT_FOUND");

		if (isUsagePeriodStale(usage, now)) {
			const { start, end } = monthPeriod(now);
			await tx.usage.update({
				where: { id: usage.id },
				data: {
					periodStart: start,
					periodEnd: end,
					aiRequestsCount: 0,
					tokensUsed: 0,
				},
			});
		}

		return tx.usage.update({
			where: { organizationId: params.orgId },
			data: {
				aiRequestsCount: { increment: 1 },
				tokensUsed: { increment: tokensToAdd },
			},
			select: {
				id: true,
				organizationId: true,
				periodStart: true,
				periodEnd: true,
				aiRequestsCount: true,
				tokensUsed: true,
			},
		});
	});
}
