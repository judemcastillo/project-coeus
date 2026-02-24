import { cookies } from "next/headers";

const E2E_DB_USER_COOKIE = "__e2e_db_user_id";

export function isE2EBypassEnabled() {
	return (
		process.env.NODE_ENV !== "production" &&
		process.env.ENABLE_E2E_TEST_BYPASS === "1"
	);
}

export async function getE2EBypassDbUserId() {
	if (!isE2EBypassEnabled()) return null;
	const store = await cookies();
	return store.get(E2E_DB_USER_COOKIE)?.value ?? null;
}

export async function setE2EBypassDbUserId(dbUserId: string) {
	if (!isE2EBypassEnabled()) {
		throw new Error("E2E_BYPASS_DISABLED");
	}

	const store = await cookies();
	store.set(E2E_DB_USER_COOKIE, dbUserId, {
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		path: "/",
	});
}

export async function clearE2EBypassDbUserId() {
	if (!isE2EBypassEnabled()) return;
	const store = await cookies();
	store.delete(E2E_DB_USER_COOKIE);
}
