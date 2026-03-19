"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTenantCtx } from "@/features/auth/ctx";
import { requireOwner } from "@/features/auth/rbac";
import {
	addMemberToOrgByEmail,
	changeMemberRole,
} from "@/features/member/member.service";

const roleSchema = z.enum(["OWNER", "ADMIN", "MEMBER"]);

const addMemberSchema = z.object({
	email: z.string().trim().email().max(320),
	role: roleSchema,
});

const changeRoleSchema = z.object({
	membershipId: z.string().min(1),
	role: roleSchema,
});

export async function addMemberAction(formData: FormData) {
	const ctx = await getTenantCtx({ authRedirectTo: "/members" });
	requireOwner(ctx);

	const { email, role } = addMemberSchema.parse({
		email: formData.get("email"),
		role: formData.get("role"),
	});

	try {
		await addMemberToOrgByEmail(ctx, { email, role });
	} catch (error) {
		if (error instanceof Error && error.message === "USER_NOT_FOUND") {
			redirect("/members?addError=user-not-found");
		}
		if (error instanceof Error && error.message === "ALREADY_MEMBER") {
			redirect("/members?addError=already-member");
		}
		throw error;
	}
	revalidatePath("/members");
}

export async function changeMemberRoleAction(formData: FormData) {
	const ctx = await getTenantCtx({ authRedirectTo: "/members" });
	requireOwner(ctx);

	const { membershipId, role } = changeRoleSchema.parse({
		membershipId: formData.get("membershipId"),
		role: formData.get("role"),
	});

	try {
		await changeMemberRole(ctx, { membershipId, role });
	} catch (error) {
		if (error instanceof Error && error.message === "LAST_OWNER") {
			redirect("/members?roleError=last-owner");
		}
		if (error instanceof Error && error.message === "NOT_FOUND") {
			redirect("/members?roleError=not-found");
		}
		throw error;
	}
	revalidatePath("/members");
}
