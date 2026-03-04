import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TenantCtx } from "@/features/auth/ctx";

const state = vi.hoisted(() => ({
	getTenantCtx: vi.fn(),
	createTask: vi.fn(),
	updateTask: vi.fn(),
	softDeleteTask: vi.fn(),
	revalidatePath: vi.fn(),
	redirects: [] as string[],
}));

vi.mock("@/features/auth/ctx", () => ({
	getTenantCtx: state.getTenantCtx,
}));

vi.mock("@/features/task/task.service", () => ({
	createTask: state.createTask,
	updateTask: state.updateTask,
	softDeleteTask: state.softDeleteTask,
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
		org: { name: "Acme", plan: "FREE" },
	};
}

describe("task actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		state.getTenantCtx.mockResolvedValue(makeCtx("ADMIN"));
		state.createTask.mockResolvedValue({ id: "task_1" });
		state.updateTask.mockResolvedValue({ id: "task_1" });
		state.softDeleteTask.mockResolvedValue(undefined);
		state.revalidatePath.mockReset();
		state.redirects = [];
	});

	it("blocks MEMBER from create/update/delete and skips service mutations", async () => {
		const actions = await import("@/app/tasks/actions");
		state.getTenantCtx.mockResolvedValue(makeCtx("MEMBER"));

		const createForm = new FormData();
		createForm.set("projectId", "project_1");
		createForm.set("title", "Task A");
		await expect(actions.createTaskAction(createForm)).rejects.toThrow("FORBIDDEN");

		const updateForm = new FormData();
		updateForm.set("taskId", "task_1");
		updateForm.set("title", "Task B");
		await expect(actions.updateTaskAction(updateForm)).rejects.toThrow("FORBIDDEN");

		const deleteForm = new FormData();
		deleteForm.set("taskId", "task_1");
		await expect(actions.deleteTaskAction(deleteForm)).rejects.toThrow("FORBIDDEN");

		expect(state.createTask).not.toHaveBeenCalled();
		expect(state.updateTask).not.toHaveBeenCalled();
		expect(state.softDeleteTask).not.toHaveBeenCalled();
	});

	it("allows ADMIN to create task and maps NONE priority to null", async () => {
		const { createTaskAction } = await import("@/app/tasks/actions");

		const formData = new FormData();
		formData.set("projectId", "project_1");
		formData.set("title", "  Task Alpha  ");
		formData.set("description", "  Optional description  ");
		formData.set("priority", "NONE");
		formData.set("status", "ONHOLD");

		await expect(createTaskAction(formData)).rejects.toThrow(
			"REDIRECT:/tasks?result=created"
		);

		expect(state.createTask).toHaveBeenCalledWith(makeCtx("ADMIN"), {
			projectId: "project_1",
			title: "Task Alpha",
			description: "Optional description",
			priority: null,
			status: "ONHOLD",
		});
		expect(state.revalidatePath).toHaveBeenCalledWith("/tasks");
		expect(state.redirects).toContain("/tasks?result=created");
	});

	it("allows ADMIN to update and delete tasks", async () => {
		const actions = await import("@/app/tasks/actions");

		const updateForm = new FormData();
		updateForm.set("taskId", "task_1");
		updateForm.set("title", "Task Updated");
		updateForm.set("description", "Updated");
		updateForm.set("priority", "HIGH");
		updateForm.set("status", "DONE");
		await expect(actions.updateTaskAction(updateForm)).rejects.toThrow(
			"REDIRECT:/tasks?result=updated"
		);
		expect(state.updateTask).toHaveBeenCalledWith(makeCtx("ADMIN"), {
			taskId: "task_1",
			title: "Task Updated",
			description: "Updated",
			priority: "HIGH",
			status: "DONE",
		});

		const deleteForm = new FormData();
		deleteForm.set("taskId", "task_1");
		await expect(actions.deleteTaskAction(deleteForm)).rejects.toThrow(
			"REDIRECT:/tasks?result=deleted"
		);
		expect(state.softDeleteTask).toHaveBeenCalledWith(makeCtx("ADMIN"), {
			taskId: "task_1",
		});
		expect(state.revalidatePath).toHaveBeenCalledWith("/tasks");
		expect(state.redirects).toContain("/tasks?result=updated");
		expect(state.redirects).toContain("/tasks?result=deleted");
	});

	it("maps service and validation failures into route-level errors", async () => {
		const actions = await import("@/app/tasks/actions");

		state.createTask.mockRejectedValueOnce(new Error("NOT_FOUND"));
		const createForm = new FormData();
		createForm.set("projectId", "project_1");
		createForm.set("title", "Task A");
		await expect(actions.createTaskAction(createForm)).rejects.toThrow(
			"REDIRECT:/tasks?error=project-not-found"
		);

		state.updateTask.mockRejectedValueOnce(new Error("NOT_FOUND"));
		const updateForm = new FormData();
		updateForm.set("taskId", "task_1");
		updateForm.set("title", "Task B");
		await expect(actions.updateTaskAction(updateForm)).rejects.toThrow(
			"REDIRECT:/tasks?error=task-not-found"
		);

		const invalidCreateForm = new FormData();
		invalidCreateForm.set("projectId", "project_1");
		invalidCreateForm.set("title", "x");
		await expect(actions.createTaskAction(invalidCreateForm)).rejects.toThrow(
			"REDIRECT:/tasks?error=invalid-input"
		);
	});
});
