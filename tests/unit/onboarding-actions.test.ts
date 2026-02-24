import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
	requireAuth: vi.fn(),
	getDbUser: vi.fn(),
	createOrgForUser: vi.fn(),
	setActiveOrgId: vi.fn(),
	redirects: [] as string[],
}));

vi.mock("@/features/auth/requireAuth", () => ({
	requireAuth: state.requireAuth,
}));

vi.mock("@/features/auth/getDbUser", () => ({
	getDbUser: state.getDbUser,
}));

vi.mock("@/features/org/org.service", () => ({
	createOrgForUser: state.createOrgForUser,
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

describe("createOrgAction", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		state.redirects = [];

		state.requireAuth.mockResolvedValue({ clerkUserId: "clerk_1" });
		state.getDbUser.mockResolvedValue({ id: "db_user_1" });
		state.createOrgForUser.mockResolvedValue({ id: "org_1", name: "Acme" });
		state.setActiveOrgId.mockResolvedValue(undefined);
	});

	it("authenticates, creates org, sets active org cookie, and redirects", async () => {
		const { createOrgAction } = await import("@/app/onboarding/actions");
		const formData = new FormData();
		formData.set("orgName", "  Acme  ");

		await expect(createOrgAction(formData)).rejects.toThrow("REDIRECT:/dashboard");

		expect(state.requireAuth).toHaveBeenCalledWith("/onboarding");
		expect(state.getDbUser).toHaveBeenCalledTimes(1);
		expect(state.createOrgForUser).toHaveBeenCalledWith({
			userId: "db_user_1",
			name: "Acme",
		});
		expect(state.setActiveOrgId).toHaveBeenCalledWith("org_1");
		expect(state.redirects).toEqual(["/dashboard"]);
	});

	it("fails validation before DB writes for invalid org names", async () => {
		const { createOrgAction } = await import("@/app/onboarding/actions");
		const formData = new FormData();
		formData.set("orgName", " ");

		await expect(createOrgAction(formData)).rejects.toThrow();

		expect(state.requireAuth).toHaveBeenCalledWith("/onboarding");
		expect(state.getDbUser).not.toHaveBeenCalled();
		expect(state.createOrgForUser).not.toHaveBeenCalled();
		expect(state.setActiveOrgId).not.toHaveBeenCalled();
		expect(state.redirects).toEqual([]);
	});
});
