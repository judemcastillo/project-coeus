import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
	getDbUser: vi.fn(),
	listOrgMembershipsForUser: vi.fn(),
	setActiveOrgId: vi.fn(),
}));

vi.mock("@/features/auth/getDbUser", () => ({
	getDbUser: state.getDbUser,
}));

vi.mock("@/features/tenant/membership", () => ({
	listOrgMembershipsForUser: state.listOrgMembershipsForUser,
}));

vi.mock("@/features/tenant/activeOrg", () => ({
	setActiveOrgId: state.setActiveOrgId,
}));

describe("/org/select/auto route", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		state.getDbUser.mockResolvedValue({ id: "db_user_1" });
		state.setActiveOrgId.mockResolvedValue(undefined);
	});

	it("redirects to /onboarding when user has no orgs", async () => {
		state.listOrgMembershipsForUser.mockResolvedValue([]);
		const { GET } = await import("@/app/org/select/auto/route");

		const res = await GET(new Request("http://localhost:3000/org/select/auto"));

		expect(res.status).toBe(307);
		expect(res.headers.get("location")).toBe("http://localhost:3000/onboarding");
		expect(state.setActiveOrgId).not.toHaveBeenCalled();
	});

	it("sets active org and redirects to /dashboard when user has one org", async () => {
		state.listOrgMembershipsForUser.mockResolvedValue([
			{ organizationId: "org_1" },
		]);
		const { GET } = await import("@/app/org/select/auto/route");

		const res = await GET(new Request("http://localhost:3000/org/select/auto"));

		expect(state.setActiveOrgId).toHaveBeenCalledWith("org_1");
		expect(res.status).toBe(307);
		expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard");
	});

	it("redirects to /org/select when user has multiple orgs", async () => {
		state.listOrgMembershipsForUser.mockResolvedValue([
			{ organizationId: "org_1" },
			{ organizationId: "org_2" },
		]);
		const { GET } = await import("@/app/org/select/auto/route");

		const res = await GET(new Request("http://localhost:3000/org/select/auto"));

		expect(res.status).toBe(307);
		expect(res.headers.get("location")).toBe("http://localhost:3000/org/select");
		expect(state.setActiveOrgId).not.toHaveBeenCalled();
	});
});
