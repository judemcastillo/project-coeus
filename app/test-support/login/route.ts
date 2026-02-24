import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createOrgForUser } from "@/features/org/org.service";
import { setActiveOrgId } from "@/features/tenant/activeOrg";
import {
	isE2EBypassEnabled,
	setE2EBypassDbUserId,
} from "@/features/auth/e2eBypass";

function testRouteDisabled() {
	return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST(request: Request) {
	if (!isE2EBypassEnabled()) return testRouteDisabled();

	const body = (await request.json().catch(() => ({}))) as {
		orgName?: string;
		email?: string;
		name?: string;
	};

	const nonce = randomUUID();
	const email = body.email ?? `e2e-${nonce}@example.test`;
	const name = body.name ?? "E2E Test User";
	const orgName = body.orgName?.trim() || "E2E Workspace";

	const user = await prisma.user.create({
		data: {
			clerkUserId: `e2e_clerk_${nonce}`,
			email,
			name,
		},
		select: { id: true },
	});

	const org = await createOrgForUser({ userId: user.id, name: orgName });

	await setE2EBypassDbUserId(user.id);
	await setActiveOrgId(org.id);

	return NextResponse.json({
		ok: true,
		userId: user.id,
		orgId: org.id,
		orgName: org.name,
	});
}
