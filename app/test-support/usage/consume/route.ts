import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveOrgId } from "@/features/tenant/activeOrg";
import {
	getE2EBypassDbUserId,
	isE2EBypassEnabled,
} from "@/features/auth/e2eBypass";
import {
	assertAiRequestWithinLimit,
	getUsageSummary,
	incrementAiUsage,
} from "@/features/usage/usage.service";

function testRouteDisabled() {
	return NextResponse.json({ error: "Not found" }, { status: 404 });
}

function parseNonNegativeInt(value: unknown, fallback: number) {
	if (value === undefined) return fallback;
	if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
		return null;
	}
	return value;
}

export async function POST(request: Request) {
	if (!isE2EBypassEnabled()) return testRouteDisabled();

	const dbUserId = await getE2EBypassDbUserId();
	if (!dbUserId) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
	}

	const orgId = await getActiveOrgId();
	if (!orgId) {
		return NextResponse.json({ error: "No active org" }, { status: 400 });
	}

	const membership = await prisma.membership.findUnique({
		where: {
			userId_organizationId: {
				userId: dbUserId,
				organizationId: orgId,
			},
		},
		select: {
			id: true,
			organization: { select: { name: true, plan: true } },
		},
	});
	if (!membership) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const body = (await request.json().catch(() => ({}))) as {
		tokensUsed?: unknown;
	};
	const tokensUsed = parseNonNegativeInt(body.tokensUsed, 0);
	if (tokensUsed === null) {
		return NextResponse.json(
			{ error: "tokensUsed must be a non-negative integer" },
			{ status: 400 }
		);
	}

	const ctx = {
		orgId,
		org: membership.organization,
	};

	try {
		await assertAiRequestWithinLimit(ctx);
	} catch (error) {
		if (error instanceof Error && error.message === "USAGE_LIMIT_EXCEEDED") {
			const summary = await getUsageSummary(ctx);
			return NextResponse.json(
				{ error: "USAGE_LIMIT_EXCEEDED", summary },
				{ status: 429 }
			);
		}
		throw error;
	}

	const usage = await incrementAiUsage({ orgId, tokensUsed });
	const summary = await getUsageSummary(ctx);

	return NextResponse.json({
		ok: true,
		usage: {
			aiRequestsCount: usage.aiRequestsCount,
			tokensUsed: usage.tokensUsed,
			periodStart: usage.periodStart,
			periodEnd: usage.periodEnd,
		},
		summary,
	});
}
