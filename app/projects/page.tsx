import { getTenantCtx } from "@/features/auth/ctx";
import { listProjects } from "@/features/project/project.service";
import {
	createProjectAction,
	deleteProjectAction,
	updateProjectAction,
} from "./actions";

type ProjectsPageProps = {
	searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleParam(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

function getStatusMessage(params: Record<string, string | string[] | undefined>) {
	const result = getSingleParam(params.result);
	const error = getSingleParam(params.error);

	if (result === "created") {
		return {
			tone: "success" as const,
			text: "Project created.",
		};
	}
	if (result === "updated") {
		return {
			tone: "success" as const,
			text: "Project updated.",
		};
	}
	if (result === "deleted") {
		return {
			tone: "success" as const,
			text: "Project deleted.",
		};
	}
	if (error === "invalid-input") {
		return {
			tone: "warning" as const,
			text: "Could not save project: please review the form values.",
		};
	}
	if (error === "project-not-found") {
		return {
			tone: "warning" as const,
			text: "Project was not found (it may have already been deleted).",
		};
	}
	return null;
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
	const ctx = await getTenantCtx({ authRedirectTo: "/projects" });
	const [projects, params] = await Promise.all([
		listProjects({ orgId: ctx.orgId }),
		searchParams ?? Promise.resolve({}),
	]);
	const status = getStatusMessage(params);
	const canManageProjects = ctx.role === "OWNER" || ctx.role === "ADMIN";

	return (
		<main className="p-6">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold">Projects</h1>
					<p className="text-sm text-muted-foreground">
						Workspace: {ctx.org.name} ({ctx.org.plan})
					</p>
				</div>
				<a href="/dashboard" className="rounded-md border px-3 py-2 text-sm">
					Back to dashboard
				</a>
			</div>

			{status ? (
				<p
					className={
						status.tone === "success"
							? "mt-4 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800"
							: "mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800"
					}
					data-testid="projects-status"
				>
					{status.text}
				</p>
			) : null}

			<section className="mt-6 rounded-lg border p-4">
				<h2 className="font-medium">Create project</h2>
				{canManageProjects ? (
					<form
						action={createProjectAction}
						className="mt-3 space-y-3"
						data-testid="project-create-form"
					>
						<input
							name="name"
							placeholder="Project name"
							data-testid="project-create-name"
							className="w-full rounded-md border px-3 py-2"
							required
						/>
						<textarea
							name="description"
							placeholder="Description (optional)"
							data-testid="project-create-description"
							className="w-full rounded-md border px-3 py-2 min-h-24"
						/>
						<button
							className="rounded-md border px-3 py-2 text-sm"
							data-testid="project-create-submit"
						>
							Create project
						</button>
					</form>
				) : (
					<p className="mt-3 text-sm text-muted-foreground">
						You have view-only access in this workspace. Ask an admin or owner to
						create projects.
					</p>
				)}
			</section>

			<section className="mt-6 rounded-lg border p-4">
				<h2 className="font-medium">Project list</h2>
				{projects.length === 0 ? (
					<p className="mt-3 text-sm text-muted-foreground">
						No projects yet for this workspace.
					</p>
				) : (
					<div className="mt-3 space-y-3">
						{projects.map((project) => (
							<div
								key={project.id}
								data-testid={`project-row-${project.id}`}
								className="rounded-md border p-3 flex items-start justify-between gap-4"
							>
								<div className="flex-1 min-w-0">
									<div
										className="font-medium"
										data-testid={`project-name-${project.id}`}
									>
										{project.name}
									</div>
									{project.description && (
										<p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
											{project.description}
										</p>
									)}
									<div className="mt-2 text-xs text-muted-foreground">
										Created: {project.createdAt.toLocaleString()}
									</div>
									<div className="mt-2 text-xs text-muted-foreground">
										Updated: {project.updatedAt.toLocaleString()}
									</div>
									{canManageProjects ? (
										<form action={updateProjectAction} className="mt-3 space-y-2">
											<input
												type="hidden"
												name="projectId"
												value={project.id}
											/>
											<input
												name="name"
												defaultValue={project.name}
												className="w-full rounded-md border px-3 py-2 text-sm"
												required
											/>
											<textarea
												name="description"
												defaultValue={project.description ?? ""}
												className="w-full rounded-md border px-3 py-2 text-sm min-h-20"
											/>
											<button className="rounded-md border px-3 py-2 text-sm">
												Save changes
											</button>
										</form>
									) : null}
								</div>
								{canManageProjects ? (
									<form action={deleteProjectAction}>
										<input type="hidden" name="projectId" value={project.id} />
										<button className="rounded-md border px-3 py-2 text-sm">
											Delete
										</button>
									</form>
								) : (
									<div className="text-sm text-muted-foreground">View only</div>
								)}
							</div>
						))}
					</div>
				)}
			</section>
		</main>
	);
}
