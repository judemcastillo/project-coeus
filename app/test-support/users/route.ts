import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isE2EBypassEnabled } from "@/features/auth/e2eBypass";

function testRouteDisabled() {
	return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST(request: Request) {
	if (!isE2EBypassEnabled()) return testRouteDisabled();

	const body = (await request.json().catch(() => ({}))) as {
		email?: string;
		name?: string;
	};

	const nonce = randomUUID();
	const email = body.email?.trim() || `e2e-user-${nonce}@example.test`;
	const name = body.name?.trim() || "E2E Extra User";

	const user = await prisma.user.create({
		data: {
			clerkUserId: `e2e_extra_clerk_${nonce}`,
			email,
			name,
		},
		select: {
			id: true,
			email: true,
			name: true,
		},
	});

	return NextResponse.json({ ok: true, user });
}
