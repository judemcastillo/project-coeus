import Link from "next/link";
import { getTenantCtx } from "@/features/auth/ctx";
import { getUsageSummary } from "@/features/usage/usage.service";

export default async function UsageSettingsPage() {
	const ctx = await getTenantCtx({ authRedirectTo: "/settings/usage" });
	const usage = await getUsageSummary(ctx);

	return (
		<main className="p-6">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold">Usage</h1>
					<p className="text-sm text-muted-foreground">
						Workspace: {ctx.org.name} ({ctx.org.plan})
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Link href="/dashboard" className="rounded-md border px-3 py-2 text-sm">
						Dashboard
					</Link>
					<Link href="/projects" className="rounded-md border px-3 py-2 text-sm">
						Projects
					</Link>
				</div>
			</div>

			<section className="mt-6 rounded-lg border p-4">
				<h2 className="font-medium">AI request quota</h2>
				<div className="mt-3 grid gap-3 md:grid-cols-3">
						<div className="rounded-md border p-3">
							<div className="text-xs text-muted-foreground">Used this period</div>
							<div
								className="mt-1 text-2xl font-semibold"
								data-testid="usage-ai-used"
							>
								{usage.aiRequests.used}
							</div>
						</div>
						<div className="rounded-md border p-3">
							<div className="text-xs text-muted-foreground">Limit ({usage.plan})</div>
							<div
								className="mt-1 text-2xl font-semibold"
								data-testid="usage-ai-limit"
							>
								{usage.aiRequests.limit}
							</div>
						</div>
						<div className="rounded-md border p-3">
							<div className="text-xs text-muted-foreground">Remaining</div>
							<div
								className="mt-1 text-2xl font-semibold"
								data-testid="usage-ai-remaining"
							>
								{usage.aiRequests.remaining}
							</div>
						</div>
				</div>
				<div className="mt-4 text-sm text-muted-foreground">
					Current period: {usage.periodStart.toLocaleString()} to{" "}
					{usage.periodEnd.toLocaleString()}
				</div>
				<div className="mt-1 text-sm text-muted-foreground">
					Tokens used this period: {usage.tokensUsed}
				</div>
				<div className="mt-3">
					<Link
						href="/settings/usage/test"
						className="inline-block rounded-md border px-3 py-2 text-sm"
					>
						Open usage test page
					</Link>
					<Link
						href="/ai/project-report"
						className="ml-2 inline-block rounded-md border px-3 py-2 text-sm"
					>
						Open AI project reports
					</Link>
				</div>
				{usage.aiRequests.isOverLimit ? (
					<p
						className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800"
						data-testid="usage-limit-warning"
					>
						AI request limit reached for this billing period.
					</p>
				) : null}
			</section>
		</main>
	);
}
