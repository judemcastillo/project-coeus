import Link from "next/link";
import { getTenantCtx } from "@/features/auth/ctx";
import { requireAdmin } from "@/features/auth/rbac";
import { listProjects } from "@/features/project/project.service";
import {
	generateProjectReportAction,
} from "./actions";
import { listProjectReportHistory } from "@/features/ai/project-report.service";

type PageProps = {
	searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleParam(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

function getStatusMessage(params: Record<string, string | string[] | undefined>) {
	const result = getSingleParam(params.result);
	const error = getSingleParam(params.error);

	if (result === "success") {
		return {
			tone: "success" as const,
			text: "Project status report generated, logged, and usage updated.",
		};
	}
	if (error === "usage-limit") {
		return {
			tone: "warning" as const,
			text: "Request blocked: AI usage limit reached for this billing period.",
		};
	}
	if (error === "project-not-found") {
		return {
			tone: "warning" as const,
			text: "Selected project was not found in the current workspace.",
		};
	}
	if (error === "provider") {
		return {
			tone: "warning" as const,
			text: "AI provider request failed. Check Gemini configuration and try again.",
		};
	}
	return null;
}

export default async function ProjectReportPage({ searchParams }: PageProps) {
	const ctx = await getTenantCtx({ authRedirectTo: "/ai/project-report" });
	requireAdmin(ctx);

	const [projects, reports, params] = await Promise.all([
		listProjects({ orgId: ctx.orgId }),
		listProjectReportHistory({ orgId: ctx.orgId, limit: 10 }),
		searchParams ?? Promise.resolve({}),
	]);
	const status = getStatusMessage(params);

	return (
		<main className="p-6">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold">AI Project Reports</h1>
					<p className="text-sm text-muted-foreground">
						Workspace: {ctx.org.name} ({ctx.org.plan}) · Role: {ctx.role}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Link href="/dashboard" className="rounded-md border px-3 py-2 text-sm">
						Dashboard
					</Link>
					<Link href="/projects" className="rounded-md border px-3 py-2 text-sm">
						Projects
					</Link>
					<Link
						href="/settings/usage"
						className="rounded-md border px-3 py-2 text-sm"
					>
						Usage
					</Link>
				</div>
			</div>

			{status ? (
				<p
					data-testid="ai-project-report-status"
					className={
						status.tone === "success"
							? "mt-4 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800"
							: "mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800"
					}
				>
					{status.text}
				</p>
			) : null}

			<section className="mt-6 rounded-lg border p-4">
				<h2 className="font-medium">Generate report</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Generates a tenant-scoped project status report and logs AI usage.
				</p>
				{projects.length === 0 ? (
					<p className="mt-3 text-sm text-muted-foreground">
						No projects available. Create a project first.
					</p>
				) : (
					<form
						action={generateProjectReportAction}
						className="mt-3 flex flex-wrap items-end gap-3"
						data-testid="ai-project-report-form"
					>
						<div className="min-w-72">
							<label
								htmlFor="projectId"
								className="mb-1 block text-xs text-muted-foreground"
							>
								Project
							</label>
							<select
								id="projectId"
								name="projectId"
								className="w-full rounded-md border px-3 py-2"
								data-testid="ai-project-report-project-select"
								defaultValue={projects[0]?.id}
							>
								{projects.map((project) => (
									<option key={project.id} value={project.id}>
										{project.name}
									</option>
								))}
							</select>
						</div>
						<button
							className="rounded-md border px-3 py-2 text-sm"
							data-testid="ai-project-report-submit"
						>
							Generate status report
						</button>
					</form>
				)}
			</section>

			<section className="mt-6 rounded-lg border p-4">
				<h2 className="font-medium">Recent generated reports</h2>
				{reports.length === 0 ? (
					<p className="mt-3 text-sm text-muted-foreground">
						No reports generated yet.
					</p>
				) : (
					<div className="mt-3 space-y-3">
						{reports.map((report) => (
							<div
								key={report.id}
								className="rounded-md border p-3"
								data-testid="ai-project-report-history-row"
							>
								<div className="text-sm">
									<span className="font-medium">{report.projectName}</span>
									<span className="text-muted-foreground">
										{" "}
										· {report.model} · by {report.actorName} ·{" "}
										{report.createdAt.toLocaleString()}
									</span>
								</div>
									<pre
										className="mt-2 whitespace-pre-wrap text-sm rounded-md bg-muted/40 p-3"
										data-testid="ai-project-report-output"
									>
										{report.output}
									</pre>
								</div>
						))}
					</div>
				)}
			</section>
		</main>
	);
}
