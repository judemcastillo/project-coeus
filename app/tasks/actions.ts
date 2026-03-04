"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTenantCtx } from "@/features/auth/ctx";
import { requireAdmin } from "@/features/auth/rbac";
import {
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
});

const updateTaskSchema = z.object({
	taskId: z.string().min(1),
	title: z.string().trim().min(2).max(160),
	description: z.string().trim().max(1200).optional(),
	priority: priorityInputSchema.default("NONE"),
	status: statusInputSchema.default("INPROGRESS"),
});

const deleteTaskSchema = z.object({
	taskId: z.string().min(1),
});

function parsePriority(value: z.infer<typeof priorityInputSchema>) {
	return value === "NONE" ? null : value;
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
	});
	if (!parsed.success) {
		redirect("/tasks?error=invalid-input");
	}
	const { projectId, title, description, priority, status } = parsed.data;

	try {
		await createTask(ctx, {
			projectId,
			title,
			description,
			priority: parsePriority(priority),
			status,
		});
	} catch (error) {
		if (error instanceof Error && error.message === "NOT_FOUND") {
			redirect("/tasks?error=project-not-found");
		}
		throw error;
	}
	revalidatePath("/tasks");
	redirect("/tasks?result=created");
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
	});
	if (!parsed.success) {
		redirect("/tasks?error=invalid-input");
	}
	const { taskId, title, description, priority, status } = parsed.data;

	try {
		await updateTask(ctx, {
			taskId,
			title,
			description,
			priority: parsePriority(priority),
			status,
		});
	} catch (error) {
		if (error instanceof Error && error.message === "NOT_FOUND") {
			redirect("/tasks?error=task-not-found");
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
