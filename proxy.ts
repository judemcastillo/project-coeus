import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
	const { pathname } = req.nextUrl;

	// Only protect these areas (adjust as you like)
	const needsAuth =
		pathname.startsWith("/dashboard") ||
		pathname.startsWith("/projects") ||
		pathname.startsWith("/onboarding");

	if (!needsAuth) return NextResponse.next();

	// ✅ Edge-safe session check (no Prisma, no NextAuth config import)
	const token = await getToken({
		req,
		secret: process.env.NEXTAUTH_SECRET,
	});

	const isLoggedIn = !!token;
	const activeOrgId = req.cookies.get("active_org_id")?.value;

	// Not logged in → sign in
	if (
		!isLoggedIn &&
		(pathname.startsWith("/dashboard") || pathname.startsWith("/projects"))
	) {
		return NextResponse.redirect(new URL("/api/auth/signin", req.url));
	}

	// Logged in, but no org → onboarding
	if (
		isLoggedIn &&
		!activeOrgId &&
		(pathname.startsWith("/dashboard") || pathname.startsWith("/projects"))
	) {
		return NextResponse.redirect(new URL("/onboarding", req.url));
	}

	// Logged in + has org → keep them out of onboarding
	if (isLoggedIn && activeOrgId && pathname.startsWith("/onboarding")) {
		return NextResponse.redirect(new URL("/dashboard", req.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/dashboard/:path*", "/projects/:path*", "/onboarding/:path*"],
};
