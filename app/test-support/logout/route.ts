import { NextResponse } from "next/server";
import { clearActiveOrgId } from "@/features/tenant/activeOrg";
import { clearE2EBypassDbUserId, isE2EBypassEnabled } from "@/features/auth/e2eBypass";

function testRouteDisabled() {
	return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST() {
	if (!isE2EBypassEnabled()) return testRouteDisabled();

	await clearE2EBypassDbUserId();
	await clearActiveOrgId();

	return NextResponse.json({ ok: true });
}
