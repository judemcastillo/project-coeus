import { getTenantCtx } from "@/features/auth/ctx";

export default async function DashboardPage() {
	const ctx = await getTenantCtx();

	return (
		<main className="p-6">
			<h1 className="text-2xl font-semibold">Dashboard</h1>
			<div className="mt-4 rounded-lg border p-4">
				<div>Workspace: {ctx.org.name}</div>
				<div>Plan: {ctx.org.plan}</div>
				<div>Your role: {ctx.role}</div>
			</div>
		</main>
	);
}
