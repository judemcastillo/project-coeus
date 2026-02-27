import { getTenantCtx } from "@/features/auth/ctx";
import Link from "next/link";

export default async function DashboardPage() {
	const ctx = await getTenantCtx();

	return (
		<main className="p-6">
			<h1 className="text-2xl font-semibold">Dashboard</h1>
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
		</main>
	);
}
