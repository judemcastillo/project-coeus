import { getTenantCtx } from "@/features/auth/ctx";
import { getDbUser } from "@/features/auth/getDbUser";
import Link from "next/link";
import { deleteOrgAction } from "./actions";

type DashboardPageProps = {
	searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleParam(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

function getStatusMessage(params: Record<string, string | string[] | undefined>) {
	const error = getSingleParam(params.error);
	if (error === "invalid-org-confirmation") {
		return "Enter the workspace name to confirm deletion.";
	}
	if (error === "org-name-mismatch") {
		return "Workspace name did not match. Deletion was cancelled.";
	}
	if (error === "org-not-found") {
		return "Workspace was not found. It may already be deleted.";
	}
	return null;
}

function getFirstName(name: string | null | undefined) {
	if (!name) return null;
	const [firstName] = name.trim().split(/\s+/);
	return firstName || null;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
	const [ctx, dbUser] = await Promise.all([getTenantCtx(), getDbUser()]);
	const params = (await searchParams) ?? {};
	const status = getStatusMessage(params);
	const canDeleteOrg = ctx.role === "OWNER";
	const firstName = getFirstName(dbUser.name);

	return (
		<main className="p-6">
			<h1 className="text-2xl font-semibold">
				{firstName ? `Welcome back, ${firstName}` : "Welcome back"}
			</h1>
			<p className="mt-1 text-sm text-muted-foreground">Dashboard</p>
			<div className="mt-4 rounded-lg border p-4">
				<div>Workspace: {ctx.org.name}</div>
				<div>Plan: {ctx.org.plan}</div>
				<div>Your role: {ctx.role}</div>
				<Link
					href="/projects"
					className="mt-3 inline-block rounded-md border px-3 py-2 text-sm"
				>
					Open projects
				</Link>
				<Link
					href="/tasks"
					className="mt-3 ml-2 inline-block rounded-md border px-3 py-2 text-sm"
				>
					Open tasks
				</Link>
				<Link
					href="/members"
					className="mt-3 ml-2 inline-block rounded-md border px-3 py-2 text-sm"
				>
					Open members
				</Link>
				<Link
					href="/settings/usage"
					className="mt-3 ml-2 inline-block rounded-md border px-3 py-2 text-sm"
				>
					Usage settings
				</Link>
				<Link
					href="/ai/project-report"
					className="mt-3 ml-2 inline-block rounded-md border px-3 py-2 text-sm"
				>
					AI project reports
				</Link>
			</div>
			<div className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 w-fit">
				<h2 className="text-base font-semibold text-red-900">Danger zone</h2>
				<p className="mt-1 text-sm text-red-800">
					Deleting this workspace permanently removes projects, tasks, members,
					usage data, AI requests, and audit logs.
				</p>
				{status ? (
					<p
						className="mt-3 rounded-md border border-red-300 bg-white px-3 py-2 text-sm text-red-700"
						data-testid="dashboard-delete-org-status"
					>
						{status}
					</p>
				) : null}
				{canDeleteOrg ? (
					<form action={deleteOrgAction} className="mt-3 flex flex-wrap items-end gap-2">
						<div className="min-w-72">
							<label
								htmlFor="confirmName"
								className="mb-1 block text-xs text-red-700"
							>
								Type <span className="font-semibold">{ctx.org.name}</span> to
								confirm
							</label>
							<input
								id="confirmName"
								name="confirmName"
								className="w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm text-black"
								placeholder={ctx.org.name}
								data-testid="dashboard-delete-org-confirm-name"
								required
							/>
						</div>
						<button
							className="rounded-md border border-red-600 bg-red-600 px-3 py-2 text-sm text-white"
							data-testid="dashboard-delete-org-submit"
						>
							Delete workspace
						</button>
					</form>
				) : (
					<p className="mt-3 text-sm text-red-700">
						Only workspace owners can delete this workspace.
					</p>
				)}
			</div>
		</main>
	);
}
