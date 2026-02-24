import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createOrgForUser } from "@/features/org/org.service";
import {
	getE2EBypassDbUserId,
	isE2EBypassEnabled,
} from "@/features/auth/e2eBypass";
import { setActiveOrgId } from "@/features/tenant/activeOrg";

function testRouteDisabled() {
	return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST(request: Request) {
	if (!isE2EBypassEnabled()) return testRouteDisabled();

	const dbUserId = await getE2EBypassDbUserId();
	if (!dbUserId) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
	}

	const user = await prisma.user.findUnique({
		where: { id: dbUserId },
		select: { id: true },
	});
	if (!user) {
		return NextResponse.json({ error: "Bypass user not found" }, { status: 404 });
	}

	const body = (await request.json().catch(() => ({}))) as {
		orgName?: string;
		activate?: boolean;
	};

	const orgName = body.orgName?.trim() || `E2E Extra Org ${randomUUID()}`;
	const org = await createOrgForUser({ userId: user.id, name: orgName });

	if (body.activate) {
		await setActiveOrgId(org.id);
	}

	return NextResponse.json({ ok: true, orgId: org.id, orgName: org.name });
}
