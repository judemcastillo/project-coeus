"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTenantCtx } from "@/features/auth/ctx";
import { requireAdmin } from "@/features/auth/rbac";
import {
	createProject,
	softDeleteProject,
	updateProject,
} from "@/features/project/project.service";

const createProjectSchema = z.object({
	name: z.string().trim().min(2).max(120),
	description: z.string().trim().max(1000).optional(),
});

const deleteProjectSchema = z.object({
	projectId: z.string().min(1),
});

const updateProjectSchema = z.object({
	projectId: z.string().min(1),
	name: z.string().trim().min(2).max(120),
	description: z.string().trim().max(1000).optional(),
});

export async function createProjectAction(formData: FormData) {
	const ctx = await getTenantCtx({ authRedirectTo: "/projects" });
	requireAdmin(ctx);
	const parsed = createProjectSchema.safeParse({
		name: formData.get("name"),
		description: formData.get("description") ?? undefined,
	});
	if (!parsed.success) {
		redirect("/projects?error=invalid-input");
	}
	const { name, description } = parsed.data;

	await createProject(ctx, { name, description });
	revalidatePath("/projects");
	redirect("/projects?result=created");
}

export async function updateProjectAction(formData: FormData) {
	const ctx = await getTenantCtx({ authRedirectTo: "/projects" });
	requireAdmin(ctx);
	const parsed = updateProjectSchema.safeParse({
		projectId: formData.get("projectId"),
		name: formData.get("name"),
		description: formData.get("description") ?? undefined,
	});
	if (!parsed.success) {
		redirect("/projects?error=invalid-input");
	}
	const { projectId, name, description } = parsed.data;

	try {
		await updateProject(ctx, { projectId, name, description });
	} catch (error) {
		if (error instanceof Error && error.message === "NOT_FOUND") {
			redirect("/projects?error=project-not-found");
		}
		throw error;
	}
	revalidatePath("/projects");
	redirect("/projects?result=updated");
}

export async function deleteProjectAction(formData: FormData) {
	const ctx = await getTenantCtx({ authRedirectTo: "/projects" });
	requireAdmin(ctx);
	const parsed = deleteProjectSchema.safeParse({
		projectId: formData.get("projectId"),
	});
	if (!parsed.success) {
		redirect("/projects?error=invalid-input");
	}
	const { projectId } = parsed.data;

	try {
		await softDeleteProject(ctx, { projectId });
	} catch (error) {
		if (error instanceof Error && error.message === "NOT_FOUND") {
			redirect("/projects?error=project-not-found");
		}
		throw error;
	}
	revalidatePath("/projects");
	redirect("/projects?result=deleted");
}
