import { cookies } from "next/headers";

const ACTIVE_ORG_COOKIE = "active_org_id";

export async function getActiveOrgId() {
	const store = await cookies();
	return store.get(ACTIVE_ORG_COOKIE)?.value ?? null;
}

export async function setActiveOrgId(orgId: string) {
	const store = await cookies();
	store.set(ACTIVE_ORG_COOKIE, orgId, {
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		path: "/",
	});
}
