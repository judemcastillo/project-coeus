import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveOrgId } from "@/features/tenant/activeOrg";
import {
	getE2EBypassDbUserId,
	isE2EBypassEnabled,
} from "@/features/auth/e2eBypass";
import { hasOrgMembership } from "@/features/tenant/membership";

function testRouteDisabled() {
	return NextResponse.json({ error: "Not found" }, { status: 404 });
}

function parseNonNegativeInt(value: unknown) {
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

	const allowed = await hasOrgMembership({ dbUserId, orgId });
	if (!allowed) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const body = (await request.json().catch(() => ({}))) as {
		aiRequestsCount?: unknown;
		tokensUsed?: unknown;
	};

	const aiRequestsCount = parseNonNegativeInt(body.aiRequestsCount);
	const tokensUsed = parseNonNegativeInt(body.tokensUsed);
	if (aiRequestsCount === null && tokensUsed === null) {
		return NextResponse.json(
			{ error: "Provide aiRequestsCount and/or tokensUsed as non-negative integers" },
			{ status: 400 }
		);
	}

	const updated = await prisma.usage.update({
		where: { organizationId: orgId },
		data: {
			...(aiRequestsCount !== null ? { aiRequestsCount } : {}),
			...(tokensUsed !== null ? { tokensUsed } : {}),
		},
		select: {
			organizationId: true,
			aiRequestsCount: true,
			tokensUsed: true,
			periodStart: true,
			periodEnd: true,
		},
	});

	return NextResponse.json({ ok: true, usage: updated });
}
