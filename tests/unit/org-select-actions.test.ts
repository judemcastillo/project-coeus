import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
	requireAuth: vi.fn(),
	getDbUser: vi.fn(),
	hasOrgMembership: vi.fn(),
	setActiveOrgId: vi.fn(),
	redirects: [] as string[],
}));

vi.mock("@/features/auth/requireAuth", () => ({
	requireAuth: state.requireAuth,
}));

vi.mock("@/features/auth/getDbUser", () => ({
	getDbUser: state.getDbUser,
}));

vi.mock("@/features/tenant/membership", () => ({
	hasOrgMembership: state.hasOrgMembership,
}));

vi.mock("@/features/tenant/activeOrg", () => ({
	setActiveOrgId: state.setActiveOrgId,
}));

vi.mock("next/navigation", () => ({
	redirect: vi.fn((url: string) => {
		state.redirects.push(url);
		throw new Error(`REDIRECT:${url}`);
	}),
}));

describe("selectOrgAction", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		state.redirects = [];
		state.requireAuth.mockResolvedValue({ clerkUserId: "clerk_1" });
		state.getDbUser.mockResolvedValue({ id: "db_user_1" });
		state.hasOrgMembership.mockResolvedValue(true);
		state.setActiveOrgId.mockResolvedValue(undefined);
	});

	it("sets active org and redirects when user belongs to org", async () => {
		const { selectOrgAction } = await import("@/app/org/select/actions");
		const formData = new FormData();
		formData.set("orgId", "org_123");

		await expect(selectOrgAction(formData)).rejects.toThrow("REDIRECT:/dashboard");

		expect(state.requireAuth).toHaveBeenCalledWith("/org/select");
		expect(state.getDbUser).toHaveBeenCalledTimes(1);
		expect(state.hasOrgMembership).toHaveBeenCalledWith({
			dbUserId: "db_user_1",
			orgId: "org_123",
		});
		expect(state.setActiveOrgId).toHaveBeenCalledWith("org_123");
		expect(state.redirects).toEqual(["/dashboard"]);
	});

	it("throws FORBIDDEN when user does not belong to org", async () => {
		const { selectOrgAction } = await import("@/app/org/select/actions");
		const formData = new FormData();
		formData.set("orgId", "org_forbidden");
		state.hasOrgMembership.mockResolvedValue(false);

		await expect(selectOrgAction(formData)).rejects.toThrow("FORBIDDEN");

		expect(state.setActiveOrgId).not.toHaveBeenCalled();
		expect(state.redirects).toEqual([]);
	});
});
