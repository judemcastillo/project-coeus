import Link from "next/link";
import { getTenantCtx } from "@/features/auth/ctx";
import { requireAdmin } from "@/features/auth/rbac";
import { getUsageSummary } from "@/features/usage/usage.service";
import { simulateAiUsageAction } from "./actions";

type UsageTestPageProps = {
	searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleParam(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

function getResultMessage(result?: string) {
	if (result === "success") {
		return {
			tone: "success" as const,
			text: "Simulated AI request succeeded and usage counters were incremented.",
		};
	}
	if (result === "limit-exceeded") {
		return {
			tone: "warning" as const,
			text: "Request blocked: AI usage limit reached for this billing period.",
		};
	}
	return null;
}

export default async function UsageTestPage({ searchParams }: UsageTestPageProps) {
	const ctx = await getTenantCtx({ authRedirectTo: "/settings/usage/test" });
	requireAdmin(ctx);

	const usage = await getUsageSummary(ctx);
	const result = getResultMessage(
		getSingleParam(((await searchParams) ?? {}).result)
	);

	return (
		<main className="p-6">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold">Usage Test</h1>
					<p className="text-sm text-muted-foreground">
						Manual verification for Milestone 7. Workspace: {ctx.org.name} ({ctx.org.plan})
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Link
						href="/settings/usage"
						className="rounded-md border px-3 py-2 text-sm"
					>
						Back to usage
					</Link>
					<Link href="/dashboard" className="rounded-md border px-3 py-2 text-sm">
						Dashboard
					</Link>
				</div>
			</div>

			{result ? (
				<p
					className={
						result.tone === "success"
							? "mt-4 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800"
							: "mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800"
					}
				>
					{result.text}
				</p>
			) : null}

			<section className="mt-6 rounded-lg border p-4">
				<h2 className="font-medium">Current usage snapshot</h2>
				<div className="mt-3 text-sm text-muted-foreground">
					AI requests:{" "}
					<span className="font-medium text-foreground">
						{usage.aiRequests.used}/{usage.aiRequests.limit}
					</span>{" "}
					(remaining {usage.aiRequests.remaining})
				</div>
				<div className="mt-1 text-sm text-muted-foreground">
					Tokens used this period: {usage.tokensUsed}
				</div>
			</section>

			<section className="mt-6 rounded-lg border p-4">
				<h2 className="font-medium">Simulate AI request</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					This increments AI request count by 1 and optionally adds tokens used.
				</p>
				<form action={simulateAiUsageAction} className="mt-3 flex flex-wrap items-end gap-3">
					<div>
						<label
							htmlFor="tokensUsed"
							className="mb-1 block text-xs text-muted-foreground"
						>
							Tokens used (optional)
						</label>
						<input
							id="tokensUsed"
							name="tokensUsed"
							type="number"
							min={0}
							defaultValue={0}
							className="rounded-md border px-3 py-2"
						/>
					</div>
					<button className="rounded-md border px-3 py-2 text-sm">
						Simulate AI Request
					</button>
				</form>
			</section>
		</main>
	);
}
