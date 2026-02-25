import { getTenantCtx } from "@/features/auth/ctx";
import { listProjects } from "@/features/project/project.service";
import {
	createProjectAction,
	deleteProjectAction,
	updateProjectAction,
} from "./actions";

export default async function ProjectsPage() {
	const ctx = await getTenantCtx({ authRedirectTo: "/projects" });
	const projects = await listProjects({ orgId: ctx.orgId });

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

			<section className="mt-6 rounded-lg border p-4">
				<h2 className="font-medium">Create project</h2>
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
										Updated {project.updatedAt.toLocaleString()}
									</div>
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
								</div>
								<form action={deleteProjectAction}>
									<input type="hidden" name="projectId" value={project.id} />
									<button className="rounded-md border px-3 py-2 text-sm">
										Delete
									</button>
								</form>
							</div>
						))}
					</div>
				)}
			</section>
		</main>
	);
}
