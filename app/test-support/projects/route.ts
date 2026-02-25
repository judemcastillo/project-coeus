import { NextResponse } from "next/server";
import { createProject } from "@/features/project/project.service";
import { getActiveOrgId } from "@/features/tenant/activeOrg";
import { hasOrgMembership } from "@/features/tenant/membership";
import {
	getE2EBypassDbUserId,
	isE2EBypassEnabled,
} from "@/features/auth/e2eBypass";

function testRouteDisabled() {
	return NextResponse.json({ error: "Not found" }, { status: 404 });
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
		name?: string;
		description?: string;
	};
	const name = body.name?.trim();
	if (!name) {
		return NextResponse.json({ error: "Name is required" }, { status: 400 });
	}

	const project = await createProject(
		{ dbUserId, orgId },
		{ name, description: body.description }
	);

	return NextResponse.json({ ok: true, project });
}
