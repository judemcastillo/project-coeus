import Link from "next/link";
import { getTenantCtx } from "@/features/auth/ctx";
import { listProjects } from "@/features/project/project.service";
import { listTasks } from "@/features/task/task.service";
import { listMembers } from "@/features/member/member.service";
import {
	addTaskCommentAction,
	createTaskAction,
	createSubtaskAction,
	deleteTaskAction,
	updateTaskAction,
} from "./actions";

type TasksPageProps = {
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
			text: "Task created.",
		};
	}
	if (result === "updated") {
		return {
			tone: "success" as const,
			text: "Task updated.",
		};
	}
	if (result === "deleted") {
		return {
			tone: "success" as const,
			text: "Task deleted.",
		};
	}
	if (result === "commented") {
		return {
			tone: "success" as const,
			text: "Comment added.",
		};
	}
	if (result === "subtask-created") {
		return {
			tone: "success" as const,
			text: "Subtask created.",
		};
	}
	if (error === "invalid-input") {
		return {
			tone: "warning" as const,
			text: "Could not save task: please review the form values.",
		};
	}
	if (error === "project-not-found") {
		return {
			tone: "warning" as const,
			text: "Selected project was not found in this workspace.",
		};
	}
	if (error === "task-not-found") {
		return {
			tone: "warning" as const,
			text: "Task was not found (it may have already been deleted).",
		};
	}
	if (error === "assignee-not-found") {
		return {
			tone: "warning" as const,
			text: "Assignee is not a member of this workspace.",
		};
	}
	if (error === "parent-task-not-found") {
		return {
			tone: "warning" as const,
			text: "Parent task was not found in the selected project.",
		};
	}
	if (error === "invalid-comment") {
		return {
			tone: "warning" as const,
			text: "Comment cannot be empty.",
		};
	}
	return null;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
	const ctx = await getTenantCtx({ authRedirectTo: "/tasks" });
	const [projects, tasks, members, params] = await Promise.all([
		listProjects({ orgId: ctx.orgId }),
		listTasks({ orgId: ctx.orgId }),
		listMembers({ orgId: ctx.orgId }),
		searchParams ?? Promise.resolve({}),
	]);
	const status = getStatusMessage(params);
	const canManageTasks = ctx.role === "OWNER" || ctx.role === "ADMIN";
	const rootTasks = tasks.filter((task) => task.parentTaskId === null);

	return (
		<main className="p-6">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold">Tasks</h1>
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

			{status ? (
				<p
					className={
						status.tone === "success"
							? "mt-4 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800"
							: "mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800"
					}
					data-testid="tasks-status"
				>
					{status.text}
				</p>
			) : null}

			<section className="mt-6 rounded-lg border p-4">
				<h2 className="font-medium">Create task</h2>
				{projects.length === 0 ? (
					<p className="mt-3 text-sm text-muted-foreground">
						Create a project first before adding tasks.
					</p>
				) : canManageTasks ? (
					<form
						action={createTaskAction}
						className="mt-3 space-y-3"
						data-testid="task-create-form"
					>
						<select
							name="projectId"
							defaultValue={projects[0]?.id}
							className="w-full rounded-md border px-3 py-2"
							data-testid="task-create-project"
						>
							{projects.map((project) => (
								<option key={project.id} value={project.id}>
									{project.name}
								</option>
							))}
						</select>
						<input
							name="title"
							placeholder="Task title"
							className="w-full rounded-md border px-3 py-2"
							data-testid="task-create-title"
							required
						/>
						<textarea
							name="description"
							placeholder="Description (optional)"
							className="w-full rounded-md border px-3 py-2 min-h-24"
							data-testid="task-create-description"
						/>
						<select
							name="assigneeUserId"
							defaultValue=""
							className="w-full rounded-md border px-3 py-2"
							data-testid="task-create-assignee"
						>
							<option value="">Unassigned</option>
							{members.map((membership) => (
								<option key={membership.userId} value={membership.userId}>
									Assign to {membership.user.name || membership.user.email}
								</option>
							))}
						</select>
						<select
							name="priority"
							defaultValue="NONE"
							className="w-full rounded-md border px-3 py-2"
							data-testid="task-create-priority"
						>
							<option value="NONE">No priority</option>
							<option value="LOW">Low</option>
							<option value="MEDIUM">Medium</option>
							<option value="HIGH">High</option>
						</select>
						<select
							name="status"
							defaultValue="INPROGRESS"
							className="w-full rounded-md border px-3 py-2"
							data-testid="task-create-status"
						>
							<option value="INPROGRESS">In Progress</option>
							<option value="DONE">Done</option>
							<option value="ONHOLD">On Hold</option>
						</select>
						<button
							className="rounded-md border px-3 py-2 text-sm"
							data-testid="task-create-submit"
						>
							Create task
						</button>
					</form>
				) : (
					<p className="mt-3 text-sm text-muted-foreground">
						You have view-only access in this workspace. Ask an admin or owner to
						create tasks.
					</p>
				)}
			</section>

			<section className="mt-6 rounded-lg border p-4">
				<h2 className="font-medium">Task list</h2>
				{rootTasks.length === 0 ? (
					<p className="mt-3 text-sm text-muted-foreground">
						No tasks yet for this workspace.
					</p>
				) : (
					<div className="mt-3 space-y-3">
						{rootTasks.map((task) => (
							<div
								key={task.id}
								data-testid={`task-row-${task.id}`}
								className="rounded-md border p-3 flex items-start justify-between gap-4"
							>
								<div className="flex-1 min-w-0">
									<div className="font-medium">{task.title}</div>
									<div className="mt-1 text-sm text-muted-foreground">
										Project: {task.project.name}
									</div>
									<div className="mt-1 text-sm text-muted-foreground">
										<span data-testid={`task-created-by-${task.id}`}>
											Created by: {task.creator?.name || task.creator?.email || "Unknown"}
										</span>
									</div>
									<div className="mt-1 text-sm text-muted-foreground">
										<span data-testid={`task-assignee-${task.id}`}>
											Assigned to: {task.assignee?.name || task.assignee?.email || "Unassigned"}
										</span>
									</div>
									<div className="mt-1 text-sm text-muted-foreground">
										Priority: {task.priority ?? "None"}
									</div>
									<div className="mt-1 text-sm text-muted-foreground">
										Status: {task.status}
									</div>
									{task.description ? (
										<p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
											{task.description}
										</p>
									) : null}
									<div className="mt-2 text-xs text-muted-foreground">
										Updated: {task.updatedAt.toLocaleString()}
									</div>

									{task.subtasks.length > 0 ? (
										<div className="mt-3 rounded-md border p-3" data-testid={`task-subtasks-${task.id}`}>
											<div className="text-sm font-medium">Subtasks</div>
											<div className="mt-2 space-y-1">
												{task.subtasks.map((subtask) => (
													<div key={subtask.id} className="text-sm text-muted-foreground" data-testid={`task-subtask-row-${task.id}`}>
														{subtask.title} ({subtask.status})
													</div>
												))}
											</div>
										</div>
									) : null}

									{canManageTasks ? (
										<form action={updateTaskAction} className="mt-3 space-y-2">
											<input type="hidden" name="taskId" value={task.id} />
											<input
												name="title"
												defaultValue={task.title}
												className="w-full rounded-md border px-3 py-2 text-sm"
												required
											/>
											<textarea
												name="description"
												defaultValue={task.description ?? ""}
												className="w-full rounded-md border px-3 py-2 text-sm min-h-20"
											/>
											<select
												name="assigneeUserId"
												defaultValue={task.assignee?.id ?? ""}
												className="w-full rounded-md border px-3 py-2 text-sm"
												data-testid={`task-update-assignee-${task.id}`}
											>
												<option value="">Unassigned</option>
												{members.map((membership) => (
													<option key={membership.userId} value={membership.userId}>
														Assign to {membership.user.name || membership.user.email}
													</option>
												))}
											</select>
											<select
												name="priority"
												defaultValue={task.priority ?? "NONE"}
												className="w-full rounded-md border px-3 py-2 text-sm"
											>
												<option value="NONE">No priority</option>
												<option value="LOW">Low</option>
												<option value="MEDIUM">Medium</option>
												<option value="HIGH">High</option>
											</select>
											<select
												name="status"
												defaultValue={task.status}
												className="w-full rounded-md border px-3 py-2 text-sm"
											>
												<option value="INPROGRESS">In Progress</option>
												<option value="DONE">Done</option>
												<option value="ONHOLD">On Hold</option>
											</select>
											<button className="rounded-md border px-3 py-2 text-sm">
												Save changes
											</button>
										</form>
									) : null}

									{canManageTasks ? (
										<form action={createSubtaskAction} className="mt-3 space-y-2" data-testid={`task-subtask-form-${task.id}`}>
											<input type="hidden" name="projectId" value={task.projectId} />
											<input type="hidden" name="parentTaskId" value={task.id} />
											<input
												name="title"
												placeholder="Subtask title"
												className="w-full rounded-md border px-3 py-2 text-sm"
												data-testid={`task-subtask-title-${task.id}`}
												required
											/>
											<select
												name="assigneeUserId"
												defaultValue=""
												className="w-full rounded-md border px-3 py-2 text-sm"
												data-testid={`task-subtask-assignee-${task.id}`}
											>
												<option value="">Unassigned</option>
												{members.map((membership) => (
													<option key={membership.userId} value={membership.userId}>
														Assign to {membership.user.name || membership.user.email}
													</option>
												))}
											</select>
											<select
												name="priority"
												defaultValue="NONE"
												className="w-full rounded-md border px-3 py-2 text-sm"
											>
												<option value="NONE">No priority</option>
												<option value="LOW">Low</option>
												<option value="MEDIUM">Medium</option>
												<option value="HIGH">High</option>
											</select>
											<select
												name="status"
												defaultValue="INPROGRESS"
												className="w-full rounded-md border px-3 py-2 text-sm"
											>
												<option value="INPROGRESS">In Progress</option>
												<option value="DONE">Done</option>
												<option value="ONHOLD">On Hold</option>
											</select>
											<button className="rounded-md border px-3 py-2 text-sm" data-testid={`task-subtask-submit-${task.id}`}>
												Add subtask
											</button>
										</form>
									) : null}

									<div className="mt-3 rounded-md border p-3" data-testid={`task-comments-${task.id}`}>
										<div className="text-sm font-medium">Comments</div>
										{task.comments.length === 0 ? (
											<p className="mt-2 text-sm text-muted-foreground">
												No comments yet.
											</p>
										) : (
											<div className="mt-2 space-y-2">
												{task.comments.map((comment) => (
													<div key={comment.id} className="rounded-md border p-2" data-testid={`task-comment-row-${task.id}`}>
														<div className="text-xs text-muted-foreground">
															{comment.user.name || comment.user.email} · {comment.createdAt.toLocaleString()}
														</div>
														<p className="mt-1 text-sm whitespace-pre-wrap">{comment.content}</p>
													</div>
												))}
											</div>
										)}
										<form action={addTaskCommentAction} className="mt-2 space-y-2" data-testid={`task-comment-form-${task.id}`}>
											<input type="hidden" name="taskId" value={task.id} />
											<textarea
												name="content"
												placeholder="Add comment"
												className="w-full rounded-md border px-3 py-2 text-sm min-h-20"
												data-testid={`task-comment-content-${task.id}`}
												required
											/>
											<button className="rounded-md border px-3 py-2 text-sm" data-testid={`task-comment-submit-${task.id}`}>Comment</button>
										</form>
									</div>

									<div className="mt-3 rounded-md border p-3" data-testid={`task-activity-${task.id}`}>
										<div className="text-sm font-medium">Activity</div>
										{task.activity.length === 0 ? (
											<p className="mt-2 text-sm text-muted-foreground">No activity yet.</p>
										) : (
											<div className="mt-2 space-y-1">
												{task.activity.map((event) => (
													<div key={event.id} className="text-sm text-muted-foreground" data-testid={`task-activity-row-${task.id}`}>
														{event.action} · {event.actorName} · {event.createdAt.toLocaleString()}
													</div>
												))}
											</div>
										)}
									</div>
								</div>
								{canManageTasks ? (
									<form action={deleteTaskAction}>
										<input type="hidden" name="taskId" value={task.id} />
										<button className="rounded-md border px-3 py-2 text-sm">Delete</button>
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
