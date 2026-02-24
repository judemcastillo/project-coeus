import { NextResponse } from "next/server";
import { clearActiveOrgId } from "@/features/tenant/activeOrg";

export async function GET(request: Request) {
	await clearActiveOrgId();
	return NextResponse.redirect(new URL("/org/select", request.url));
}
