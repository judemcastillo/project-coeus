import { describe, expect, it } from "vitest";
import { requireAdmin, requireOwner, requireRole } from "@/features/auth/rbac";
import type { TenantCtx } from "@/features/auth/ctx";

function makeCtx(role: TenantCtx["role"]): TenantCtx {
	return {
		dbUserId: "user_1",
		orgId: "org_1",
		role,
		org: {
			name: "Acme",
			plan: "FREE",
		},
	};
}

describe("rbac helpers", () => {
	it("allows a permitted role", () => {
		expect(() => requireRole(makeCtx("ADMIN"), ["ADMIN"])).not.toThrow();
	});

	it("throws FORBIDDEN for a disallowed role", () => {
		expect(() => requireRole(makeCtx("MEMBER"), ["ADMIN"])).toThrow("FORBIDDEN");
	});

	it("requireAdmin allows OWNER and ADMIN", () => {
		expect(() => requireAdmin(makeCtx("OWNER"))).not.toThrow();
		expect(() => requireAdmin(makeCtx("ADMIN"))).not.toThrow();
		expect(() => requireAdmin(makeCtx("MEMBER"))).toThrow("FORBIDDEN");
	});

	it("requireOwner only allows OWNER", () => {
		expect(() => requireOwner(makeCtx("OWNER"))).not.toThrow();
		expect(() => requireOwner(makeCtx("ADMIN"))).toThrow("FORBIDDEN");
	});
});
