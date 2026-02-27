import Link from "next/link";
import { getTenantCtx } from "@/features/auth/ctx";
import { listMembers } from "@/features/member/member.service";
import { addMemberAction, changeMemberRoleAction } from "./actions";

type MembersPageProps = {
	searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleParam(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

function getAddErrorMessage(code?: string) {
	if (code === "user-not-found") {
		return "User not found. Ask them to sign in first, then try again.";
	}
	if (code === "already-member") {
		return "That user is already a member of this workspace.";
	}
	return null;
}

function getRoleErrorMessage(code?: string) {
	if (code === "last-owner") {
		return "Cannot remove or downgrade the last owner of the workspace.";
	}
	if (code === "not-found") {
		return "That membership no longer exists in this workspace.";
	}
	return null;
}

export default async function MembersPage({ searchParams }: MembersPageProps) {
	const ctx = await getTenantCtx({ authRedirectTo: "/members" });
	const members = await listMembers({ orgId: ctx.orgId });
	const canManageMembers = ctx.role === "OWNER";
	const resolvedSearchParams = (await searchParams) ?? {};
	const addErrorMessage = getAddErrorMessage(
		getSingleParam(resolvedSearchParams.addError)
	);
	const roleErrorMessage = getRoleErrorMessage(
		getSingleParam(resolvedSearchParams.roleError)
	);

	return (
		<main className="p-6">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold">Members</h1>
					<p className="text-sm text-muted-foreground">
						Workspace: {ctx.org.name} ({ctx.org.plan}) · Your role: {ctx.role}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Link
						href="/dashboard"
						className="rounded-md border px-3 py-2 text-sm"
					>
						Dashboard
					</Link>
					<Link
						href="/projects"
						className="rounded-md border px-3 py-2 text-sm"
					>
						Projects
					</Link>
				</div>
			</div>

			<section className="mt-6 rounded-lg border p-4">
				<h2 className="font-medium">Add member</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Manual add by email (existing user only).
				</p>
				{canManageMembers ? (
					<>
						{addErrorMessage ? (
							<p
								className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
								data-testid="member-add-error"
							>
								{addErrorMessage}
							</p>
						) : null}
						<form
							action={addMemberAction}
							className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto]"
							data-testid="member-add-form"
						>
							<input
								name="email"
								type="email"
								placeholder="teammate@example.com"
								data-testid="member-add-email"
								className="w-full rounded-md border px-3 py-2"
								required
							/>
							<select
								name="role"
								defaultValue="MEMBER"
								data-testid="member-add-role"
								className="rounded-md border px-3 py-2"
							>
								<option value="MEMBER">MEMBER</option>
								<option value="ADMIN">ADMIN</option>
								<option value="OWNER">OWNER</option>
							</select>
							<button
								className="rounded-md border px-3 py-2 text-sm"
								data-testid="member-add-submit"
							>
								Add member
							</button>
						</form>
					</>
				) : (
					<p className="mt-3 text-sm text-muted-foreground">
						Only workspace owners can add members.
					</p>
				)}
			</section>

			<section className="mt-6 rounded-lg border p-4">
				<h2 className="font-medium">Current members</h2>
				{roleErrorMessage ? (
					<p
						className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
						data-testid="member-role-error"
					>
						{roleErrorMessage}
					</p>
				) : null}
				<div className="mt-3 space-y-3">
					{members.map((membership) => (
						<div
							key={membership.id}
							data-testid={`member-row-${membership.id}`}
							className="rounded-md border p-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
						>
							<div className="min-w-0">
								<div className="font-medium">
									{membership.user.name || membership.user.email}
								</div>
								<div className="text-sm text-muted-foreground break-all">
									{membership.user.email}
								</div>
								<div className="mt-1 text-xs text-muted-foreground">
									Joined {membership.createdAt.toLocaleString()} · Role:{" "}
									{membership.role}
								</div>
							</div>

							{canManageMembers ? (
								<form
									action={changeMemberRoleAction}
									className="flex items-center gap-2"
									data-testid={`member-role-form-${membership.id}`}
								>
									<input
										type="hidden"
										name="membershipId"
										value={membership.id}
									/>
									<select
										name="role"
										defaultValue={membership.role}
										data-testid={`member-role-select-${membership.id}`}
										className="rounded-md border px-3 py-2 text-sm"
									>
										<option value="MEMBER">MEMBER</option>
										<option value="ADMIN">ADMIN</option>
										<option value="OWNER">OWNER</option>
									</select>
									<button
										className="rounded-md border px-3 py-2 text-sm"
										data-testid={`member-role-submit-${membership.id}`}
									>
										Update role
									</button>
								</form>
							) : (
								<div className="text-sm text-muted-foreground">
									Owner-only role management
								</div>
							)}
						</div>
					))}
					{members.length === 0 ? (
						<p className="text-sm text-muted-foreground">No members found.</p>
					) : null}
				</div>
			</section>
		</main>
	);
}
