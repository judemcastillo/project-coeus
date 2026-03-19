"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTenantCtx } from "@/features/auth/ctx";
import { requireAdmin } from "@/features/auth/rbac";
import {
	addTaskComment,
	createTask,
	softDeleteTask,
	updateTask,
} from "@/features/task/task.service";

const priorityInputSchema = z.enum(["NONE", "LOW", "MEDIUM", "HIGH"]);
const statusInputSchema = z.enum(["INPROGRESS", "DONE", "ONHOLD"]);

const createTaskSchema = z.object({
	projectId: z.string().min(1),
	title: z.string().trim().min(2).max(160),
	description: z.string().trim().max(1200).optional(),
	priority: priorityInputSchema.default("NONE"),
	status: statusInputSchema.default("INPROGRESS"),
	assigneeUserId: z.string().min(1).optional(),
});

const createSubtaskSchema = z.object({
	projectId: z.string().min(1),
	parentTaskId: z.string().min(1),
	title: z.string().trim().min(2).max(160),
	priority: priorityInputSchema.default("NONE"),
	status: statusInputSchema.default("INPROGRESS"),
	assigneeUserId: z.string().min(1).optional(),
});

const updateTaskSchema = z.object({
	taskId: z.string().min(1),
	title: z.string().trim().min(2).max(160),
	description: z.string().trim().max(1200).optional(),
	priority: priorityInputSchema.default("NONE"),
	status: statusInputSchema.default("INPROGRESS"),
	assigneeUserId: z.string().min(1).optional(),
});

const deleteTaskSchema = z.object({
	taskId: z.string().min(1),
});

const commentTaskSchema = z.object({
	taskId: z.string().min(1),
	content: z.string().trim().min(1).max(1200),
});

function parsePriority(value: z.infer<typeof priorityInputSchema>) {
	return value === "NONE" ? null : value;
}

function optionalStringFromFormData(
	value: FormDataEntryValue | null
): string | undefined {
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

export async function createTaskAction(formData: FormData) {
	const ctx = await getTenantCtx({ authRedirectTo: "/tasks" });
	requireAdmin(ctx);

	const parsed = createTaskSchema.safeParse({
		projectId: formData.get("projectId"),
		title: formData.get("title"),
		description: formData.get("description") ?? undefined,
		priority: formData.get("priority") ?? "NONE",
		status: formData.get("status") ?? "INPROGRESS",
		assigneeUserId: optionalStringFromFormData(formData.get("assigneeUserId")),
	});
	if (!parsed.success) {
		redirect("/tasks?error=invalid-input");
	}
	const { projectId, title, description, priority, status, assigneeUserId } =
		parsed.data;

	try {
		await createTask(ctx, {
			projectId,
			title,
			description,
			priority: parsePriority(priority),
			status,
			assigneeUserId: assigneeUserId ?? null,
			parentTaskId: null,
		});
	} catch (error) {
		if (error instanceof Error && error.message === "NOT_FOUND") {
			redirect("/tasks?error=project-not-found");
		}
		if (error instanceof Error && error.message === "ASSIGNEE_NOT_FOUND") {
			redirect("/tasks?error=assignee-not-found");
		}
		if (error instanceof Error && error.message === "PARENT_TASK_NOT_FOUND") {
			redirect("/tasks?error=parent-task-not-found");
		}
		throw error;
	}
	revalidatePath("/tasks");
	redirect("/tasks?result=created");
}

export async function createSubtaskAction(formData: FormData) {
	const ctx = await getTenantCtx({ authRedirectTo: "/tasks" });
	requireAdmin(ctx);

	const parsed = createSubtaskSchema.safeParse({
		projectId: formData.get("projectId"),
		parentTaskId: formData.get("parentTaskId"),
		title: formData.get("title"),
		assigneeUserId: optionalStringFromFormData(formData.get("assigneeUserId")),
		priority: formData.get("priority") ?? "NONE",
		status: formData.get("status") ?? "INPROGRESS",
	});
	if (!parsed.success) {
		redirect("/tasks?error=invalid-input");
	}
	const { projectId, parentTaskId, title, assigneeUserId, priority, status } =
		parsed.data;

	try {
		await createTask(ctx, {
			projectId,
			parentTaskId,
			title,
			priority: parsePriority(priority),
			status,
			assigneeUserId: assigneeUserId ?? null,
		});
	} catch (error) {
		if (error instanceof Error && error.message === "NOT_FOUND") {
			redirect("/tasks?error=project-not-found");
		}
		if (error instanceof Error && error.message === "ASSIGNEE_NOT_FOUND") {
			redirect("/tasks?error=assignee-not-found");
		}
		if (error instanceof Error && error.message === "PARENT_TASK_NOT_FOUND") {
			redirect("/tasks?error=parent-task-not-found");
		}
		throw error;
	}
	revalidatePath("/tasks");
	redirect("/tasks?result=subtask-created");
}

export async function updateTaskAction(formData: FormData) {
	const ctx = await getTenantCtx({ authRedirectTo: "/tasks" });
	requireAdmin(ctx);

	const parsed = updateTaskSchema.safeParse({
		taskId: formData.get("taskId"),
		title: formData.get("title"),
		description: formData.get("description") ?? undefined,
		priority: formData.get("priority") ?? "NONE",
		status: formData.get("status") ?? "INPROGRESS",
		assigneeUserId: optionalStringFromFormData(formData.get("assigneeUserId")),
	});
	if (!parsed.success) {
		redirect("/tasks?error=invalid-input");
	}
	const { taskId, title, description, priority, status, assigneeUserId } = parsed.data;

	try {
		await updateTask(ctx, {
			taskId,
			title,
			description,
			priority: parsePriority(priority),
			status,
			assigneeUserId: assigneeUserId ?? null,
		});
	} catch (error) {
		if (error instanceof Error && error.message === "NOT_FOUND") {
			redirect("/tasks?error=task-not-found");
		}
		if (error instanceof Error && error.message === "ASSIGNEE_NOT_FOUND") {
			redirect("/tasks?error=assignee-not-found");
		}
		throw error;
	}
	revalidatePath("/tasks");
	redirect("/tasks?result=updated");
}

export async function deleteTaskAction(formData: FormData) {
	const ctx = await getTenantCtx({ authRedirectTo: "/tasks" });
	requireAdmin(ctx);

	const parsed = deleteTaskSchema.safeParse({
		taskId: formData.get("taskId"),
	});
	if (!parsed.success) {
		redirect("/tasks?error=invalid-input");
	}
	const { taskId } = parsed.data;

	try {
		await softDeleteTask(ctx, { taskId });
	} catch (error) {
		if (error instanceof Error && error.message === "NOT_FOUND") {
			redirect("/tasks?error=task-not-found");
		}
		throw error;
	}
	revalidatePath("/tasks");
	redirect("/tasks?result=deleted");
}

export async function addTaskCommentAction(formData: FormData) {
	const ctx = await getTenantCtx({ authRedirectTo: "/tasks" });

	const parsed = commentTaskSchema.safeParse({
		taskId: formData.get("taskId"),
		content: formData.get("content"),
	});
	if (!parsed.success) {
		redirect("/tasks?error=invalid-comment");
	}

	try {
		await addTaskComment(ctx, parsed.data);
	} catch (error) {
		if (error instanceof Error && error.message === "NOT_FOUND") {
			redirect("/tasks?error=task-not-found");
		}
		throw error;
	}

	revalidatePath("/tasks");
	redirect("/tasks?result=commented");
}
