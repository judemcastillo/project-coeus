import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TenantCtx } from "@/features/auth/ctx";

const state = vi.hoisted(() => ({
	getTenantCtx: vi.fn(),
	addMemberToOrgByEmail: vi.fn(),
	changeMemberRole: vi.fn(),
	revalidatePath: vi.fn(),
	redirect: vi.fn(),
	redirects: [] as string[],
}));

vi.mock("@/features/auth/ctx", () => ({
	getTenantCtx: state.getTenantCtx,
}));

vi.mock("@/features/member/member.service", () => ({
	addMemberToOrgByEmail: state.addMemberToOrgByEmail,
	changeMemberRole: state.changeMemberRole,
}));

vi.mock("next/cache", () => ({
	revalidatePath: state.revalidatePath,
}));

vi.mock("next/navigation", () => ({
	redirect: vi.fn((url: string) => {
		state.redirects.push(url);
		throw new Error(`REDIRECT:${url}`);
	}),
}));

function makeCtx(role: TenantCtx["role"]): TenantCtx {
	return {
		dbUserId: "db_user_1",
		orgId: "org_1",
		role,
		org: { name: "Acme", plan: "FREE" },
	};
}

describe("member actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		state.getTenantCtx.mockResolvedValue(makeCtx("OWNER"));
		state.addMemberToOrgByEmail.mockResolvedValue({ id: "m_1" });
		state.changeMemberRole.mockResolvedValue({ id: "m_1" });
		state.revalidatePath.mockReset();
		state.redirects = [];
	});

	it("blocks ADMIN and MEMBER from add/change role actions", async () => {
		const actions = await import("@/app/members/actions");

		for (const role of ["ADMIN", "MEMBER"] as const) {
			state.getTenantCtx.mockResolvedValueOnce(makeCtx(role));
			const addForm = new FormData();
			addForm.set("email", "user@example.com");
			addForm.set("role", "MEMBER");
			await expect(actions.addMemberAction(addForm)).rejects.toThrow("FORBIDDEN");

			state.getTenantCtx.mockResolvedValueOnce(makeCtx(role));
			const changeForm = new FormData();
			changeForm.set("membershipId", "m_1");
			changeForm.set("role", "ADMIN");
			await expect(actions.changeMemberRoleAction(changeForm)).rejects.toThrow(
				"FORBIDDEN"
			);
		}

		expect(state.addMemberToOrgByEmail).not.toHaveBeenCalled();
		expect(state.changeMemberRole).not.toHaveBeenCalled();
	});

	it("allows OWNER and passes validated inputs to service", async () => {
		const { addMemberAction, changeMemberRoleAction } = await import(
			"@/app/members/actions"
		);

		const addForm = new FormData();
		addForm.set("email", "  TEAMMATE@example.com  ");
		addForm.set("role", "ADMIN");
		await expect(addMemberAction(addForm)).resolves.toBeUndefined();

		const changeForm = new FormData();
		changeForm.set("membershipId", "membership_123");
		changeForm.set("role", "MEMBER");
		await expect(changeMemberRoleAction(changeForm)).resolves.toBeUndefined();

		expect(state.getTenantCtx).toHaveBeenCalledWith({ authRedirectTo: "/members" });
		expect(state.addMemberToOrgByEmail).toHaveBeenCalledWith(makeCtx("OWNER"), {
			email: "TEAMMATE@example.com",
			role: "ADMIN",
		});
		expect(state.changeMemberRole).toHaveBeenCalledWith(makeCtx("OWNER"), {
			membershipId: "membership_123",
			role: "MEMBER",
		});
		expect(state.revalidatePath).toHaveBeenCalledWith("/members");
	});

	it("redirects add-member known errors to user-facing messages", async () => {
		const { addMemberAction } = await import("@/app/members/actions");
		state.addMemberToOrgByEmail.mockRejectedValueOnce(new Error("USER_NOT_FOUND"));

		const addForm = new FormData();
		addForm.set("email", "missing@example.com");
		addForm.set("role", "MEMBER");

		await expect(addMemberAction(addForm)).rejects.toThrow(
			"REDIRECT:/members?addError=user-not-found"
		);
		expect(state.redirects).toEqual(["/members?addError=user-not-found"]);
		expect(state.revalidatePath).not.toHaveBeenCalled();
	});

	it("redirects role-change known errors to user-facing messages", async () => {
		const { changeMemberRoleAction } = await import("@/app/members/actions");
		state.changeMemberRole.mockRejectedValueOnce(new Error("LAST_OWNER"));

		const form = new FormData();
		form.set("membershipId", "m_1");
		form.set("role", "ADMIN");

		await expect(changeMemberRoleAction(form)).rejects.toThrow(
			"REDIRECT:/members?roleError=last-owner"
		);
		expect(state.redirects).toEqual(["/members?roleError=last-owner"]);
		expect(state.revalidatePath).not.toHaveBeenCalled();
	});
});
