import { NextResponse } from "next/server";
import { getDbUser } from "@/features/auth/getDbUser";
import { listOrgMembershipsForUser } from "@/features/tenant/membership";
import { setActiveOrgId } from "@/features/tenant/activeOrg";

export async function GET(request: Request) {
	const dbUser = await getDbUser();
	const memberships = await listOrgMembershipsForUser({ dbUserId: dbUser.id });

	if (memberships.length === 0) {
		return NextResponse.redirect(new URL("/onboarding", request.url));
	}

	if (memberships.length > 1) {
		return NextResponse.redirect(new URL("/org/select", request.url));
	}

	await setActiveOrgId(memberships[0].organizationId);
	return NextResponse.redirect(new URL("/dashboard", request.url));
}
