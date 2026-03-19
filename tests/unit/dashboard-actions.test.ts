import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TenantCtx } from "@/features/auth/ctx";

const state = vi.hoisted(() => ({
	getTenantCtx: vi.fn(),
	deleteOrg: vi.fn(),
	clearActiveOrgId: vi.fn(),
	redirects: [] as string[],
}));

vi.mock("@/features/auth/ctx", () => ({
	getTenantCtx: state.getTenantCtx,
}));

vi.mock("@/features/org/org.service", () => ({
	deleteOrg: state.deleteOrg,
}));

vi.mock("@/features/tenant/activeOrg", () => ({
	clearActiveOrgId: state.clearActiveOrgId,
}));

vi.mock("next/navigation", () => ({
	redirect: (to: string) => {
		state.redirects.push(to);
		throw new Error(`REDIRECT:${to}`);
	},
}));

function makeCtx(role: TenantCtx["role"]): TenantCtx {
	return {
		dbUserId: "db_user_1",
		orgId: "org_1",
		role,
		org: { name: "Acme", plan: "FREE" },
	};
}

describe("dashboard deleteOrgAction", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		state.getTenantCtx.mockResolvedValue(makeCtx("OWNER"));
		state.deleteOrg.mockResolvedValue(undefined);
		state.clearActiveOrgId.mockResolvedValue(undefined);
		state.redirects = [];
	});

	it("allows OWNER to delete org then clears active org and redirects to auto selector", async () => {
		const { deleteOrgAction } = await import("@/app/(app-shell)/dashboard/actions");
		const formData = new FormData();
		formData.set("confirmName", "Acme");

		await expect(deleteOrgAction(formData)).rejects.toThrow(
			"REDIRECT:/org/select/auto"
		);

		expect(state.getTenantCtx).toHaveBeenCalledWith({ authRedirectTo: "/dashboard" });
		expect(state.deleteOrg).toHaveBeenCalledWith(makeCtx("OWNER"), {
			confirmName: "Acme",
		});
		expect(state.clearActiveOrgId).toHaveBeenCalledTimes(1);
	});

	it("blocks MEMBER from deleting org", async () => {
		const { deleteOrgAction } = await import("@/app/(app-shell)/dashboard/actions");
		state.getTenantCtx.mockResolvedValue(makeCtx("MEMBER"));

		const formData = new FormData();
		formData.set("confirmName", "Acme");

		await expect(deleteOrgAction(formData)).rejects.toThrow("FORBIDDEN");
		expect(state.deleteOrg).not.toHaveBeenCalled();
		expect(state.clearActiveOrgId).not.toHaveBeenCalled();
	});

	it("maps validation and service errors to dashboard query params", async () => {
		const { deleteOrgAction } = await import("@/app/(app-shell)/dashboard/actions");

		const invalid = new FormData();
		await expect(deleteOrgAction(invalid)).rejects.toThrow(
			"REDIRECT:/dashboard?error=invalid-org-confirmation"
		);

		state.deleteOrg.mockRejectedValueOnce(new Error("CONFIRMATION_MISMATCH"));
		const mismatch = new FormData();
		mismatch.set("confirmName", "Wrong name");
		await expect(deleteOrgAction(mismatch)).rejects.toThrow(
			"REDIRECT:/dashboard?error=org-name-mismatch"
		);

		expect(state.clearActiveOrgId).not.toHaveBeenCalled();
	});
});
