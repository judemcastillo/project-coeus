import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveOrgId } from "@/features/tenant/activeOrg";
import {
	getE2EBypassDbUserId,
	isE2EBypassEnabled,
} from "@/features/auth/e2eBypass";

function testRouteDisabled() {
	return NextResponse.json({ error: "Not found" }, { status: 404 });
}

function isValidRole(role: unknown): role is "OWNER" | "ADMIN" | "MEMBER" {
	return role === "OWNER" || role === "ADMIN" || role === "MEMBER";
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

	const body = (await request.json().catch(() => ({}))) as {
		role?: unknown;
	};
	if (!isValidRole(body.role)) {
		return NextResponse.json({ error: "Invalid role" }, { status: 400 });
	}

	const membership = await prisma.membership.findUnique({
		where: {
			userId_organizationId: {
				userId: dbUserId,
				organizationId: orgId,
			},
		},
		select: { id: true },
	});
	if (!membership) {
		return NextResponse.json({ error: "Membership not found" }, { status: 404 });
	}

	await prisma.membership.update({
		where: { id: membership.id },
		data: { role: body.role },
	});

	return NextResponse.json({ ok: true, role: body.role });
}
