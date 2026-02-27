"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
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
	const { name, description } = createProjectSchema.parse({
		name: formData.get("name"),
		description: formData.get("description") ?? undefined,
	});

	await createProject(ctx, { name, description });
	revalidatePath("/projects");
}

export async function updateProjectAction(formData: FormData) {
	const ctx = await getTenantCtx({ authRedirectTo: "/projects" });
	requireAdmin(ctx);
	const { projectId, name, description } = updateProjectSchema.parse({
		projectId: formData.get("projectId"),
		name: formData.get("name"),
		description: formData.get("description") ?? undefined,
	});

	await updateProject(ctx, { projectId, name, description });
	revalidatePath("/projects");
}

export async function deleteProjectAction(formData: FormData) {
	const ctx = await getTenantCtx({ authRedirectTo: "/projects" });
	requireAdmin(ctx);
	const { projectId } = deleteProjectSchema.parse({
		projectId: formData.get("projectId"),
	});

	await softDeleteProject(ctx, { projectId });
	revalidatePath("/projects");
}
