import { cookies } from "next/headers";

const ACTIVE_ORG_COOKIE = "active_org_id";

export async function setActiveOrgId(orgId: string) {
  const cookieStore = await cookies();

  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function getActiveOrgId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_ORG_COOKIE)?.value ?? null;
}