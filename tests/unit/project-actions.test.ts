import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TenantCtx } from "@/features/auth/ctx";

const state = vi.hoisted(() => ({
	getTenantCtx: vi.fn(),
	createProject: vi.fn(),
	updateProject: vi.fn(),
	softDeleteProject: vi.fn(),
	revalidatePath: vi.fn(),
	redirects: [] as string[],
}));

vi.mock("@/features/auth/ctx", () => ({
	getTenantCtx: state.getTenantCtx,
}));

vi.mock("@/features/project/project.service", () => ({
	createProject: state.createProject,
	updateProject: state.updateProject,
	softDeleteProject: state.softDeleteProject,
}));

vi.mock("next/cache", () => ({
	revalidatePath: state.revalidatePath,
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
		org: {
			name: "Acme",
			plan: "FREE",
		},
	};
}

describe("project actions RBAC", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		state.getTenantCtx.mockResolvedValue(makeCtx("ADMIN"));
		state.createProject.mockResolvedValue({ id: "project_1" });
		state.updateProject.mockResolvedValue({ id: "project_1" });
		state.softDeleteProject.mockResolvedValue(undefined);
		state.revalidatePath.mockReset();
		state.redirects = [];
	});

	it("blocks MEMBER from create/update/delete and skips service mutations", async () => {
		const actions = await import("@/app/projects/actions");
		state.getTenantCtx.mockResolvedValue(makeCtx("MEMBER"));

		const createForm = new FormData();
		createForm.set("name", "Project Alpha");
		await expect(actions.createProjectAction(createForm)).rejects.toThrow(
			"FORBIDDEN"
		);

		const updateForm = new FormData();
		updateForm.set("projectId", "project_1");
		updateForm.set("name", "Project Beta");
		await expect(actions.updateProjectAction(updateForm)).rejects.toThrow(
			"FORBIDDEN"
		);

		const deleteForm = new FormData();
		deleteForm.set("projectId", "project_1");
		await expect(actions.deleteProjectAction(deleteForm)).rejects.toThrow(
			"FORBIDDEN"
		);

		expect(state.createProject).not.toHaveBeenCalled();
		expect(state.updateProject).not.toHaveBeenCalled();
		expect(state.softDeleteProject).not.toHaveBeenCalled();
	});

	it("allows ADMIN to create a project", async () => {
		const { createProjectAction } = await import("@/app/projects/actions");
		const formData = new FormData();
		formData.set("name", "  Project Alpha  ");
		formData.set("description", "  Initial scope  ");

		await expect(createProjectAction(formData)).rejects.toThrow(
			"REDIRECT:/projects?result=created"
		);

		expect(state.getTenantCtx).toHaveBeenCalledWith({ authRedirectTo: "/projects" });
		expect(state.createProject).toHaveBeenCalledWith(makeCtx("ADMIN"), {
			name: "Project Alpha",
			description: "Initial scope",
		});
		expect(state.revalidatePath).toHaveBeenCalledWith("/projects");
		expect(state.redirects).toContain("/projects?result=created");
	});

	it("maps service and validation errors into route query params", async () => {
		const { createProjectAction, updateProjectAction, deleteProjectAction } = await import(
			"@/app/projects/actions"
		);
		state.updateProject.mockRejectedValueOnce(new Error("NOT_FOUND"));

		const updateForm = new FormData();
		updateForm.set("projectId", "project_1");
		updateForm.set("name", "Project Beta");
		await expect(updateProjectAction(updateForm)).rejects.toThrow(
			"REDIRECT:/projects?error=project-not-found"
		);

		state.softDeleteProject.mockRejectedValueOnce(new Error("NOT_FOUND"));
		const deleteForm = new FormData();
		deleteForm.set("projectId", "project_1");
		await expect(deleteProjectAction(deleteForm)).rejects.toThrow(
			"REDIRECT:/projects?error=project-not-found"
		);

		const invalidForm = new FormData();
		invalidForm.set("name", "x");
		await expect(createProjectAction(invalidForm)).rejects.toThrow(
			"REDIRECT:/projects?error=invalid-input"
		);
	});
});
