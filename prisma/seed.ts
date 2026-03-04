import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error("DATABASE_URL is required to run prisma/seed.ts");
}

const prisma = new PrismaClient({
	adapter: new PrismaPg({ connectionString: databaseUrl }),
});

function monthWindow(date = new Date()) {
	const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
	const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
	return { start, end };
}

async function main() {
	const { start, end } = monthWindow();

	await prisma.$transaction(async (tx) => {
		await tx.user.upsert({
			where: { id: "seed_user_owner" },
			update: {
				clerkUserId: "seed_clerk_owner",
				email: "owner.demo@example.com",
				name: "Owner Demo",
			},
			create: {
				id: "seed_user_owner",
				clerkUserId: "seed_clerk_owner",
				email: "owner.demo@example.com",
				name: "Owner Demo",
			},
		});
		await tx.user.upsert({
			where: { id: "seed_user_admin" },
			update: {
				clerkUserId: "seed_clerk_admin",
				email: "admin.demo@example.com",
				name: "Admin Demo",
			},
			create: {
				id: "seed_user_admin",
				clerkUserId: "seed_clerk_admin",
				email: "admin.demo@example.com",
				name: "Admin Demo",
			},
		});
		await tx.user.upsert({
			where: { id: "seed_user_member" },
			update: {
				clerkUserId: "seed_clerk_member",
				email: "member.demo@example.com",
				name: "Member Demo",
			},
			create: {
				id: "seed_user_member",
				clerkUserId: "seed_clerk_member",
				email: "member.demo@example.com",
				name: "Member Demo",
			},
		});

		await tx.organization.upsert({
			where: { id: "seed_org_alpha" },
			update: { name: "Alpha Workspace", plan: "FREE" },
			create: { id: "seed_org_alpha", name: "Alpha Workspace", plan: "FREE" },
		});
		await tx.organization.upsert({
			where: { id: "seed_org_beta" },
			update: { name: "Beta Workspace", plan: "PRO" },
			create: { id: "seed_org_beta", name: "Beta Workspace", plan: "PRO" },
		});

		await tx.membership.upsert({
			where: { id: "seed_membership_alpha_owner" },
			update: { userId: "seed_user_owner", organizationId: "seed_org_alpha", role: "OWNER" },
			create: {
				id: "seed_membership_alpha_owner",
				userId: "seed_user_owner",
				organizationId: "seed_org_alpha",
				role: "OWNER",
			},
		});
		await tx.membership.upsert({
			where: { id: "seed_membership_alpha_admin" },
			update: { userId: "seed_user_admin", organizationId: "seed_org_alpha", role: "ADMIN" },
			create: {
				id: "seed_membership_alpha_admin",
				userId: "seed_user_admin",
				organizationId: "seed_org_alpha",
				role: "ADMIN",
			},
		});
		await tx.membership.upsert({
			where: { id: "seed_membership_alpha_member" },
			update: { userId: "seed_user_member", organizationId: "seed_org_alpha", role: "MEMBER" },
			create: {
				id: "seed_membership_alpha_member",
				userId: "seed_user_member",
				organizationId: "seed_org_alpha",
				role: "MEMBER",
			},
		});
		await tx.membership.upsert({
			where: { id: "seed_membership_beta_owner" },
			update: { userId: "seed_user_owner", organizationId: "seed_org_beta", role: "OWNER" },
			create: {
				id: "seed_membership_beta_owner",
				userId: "seed_user_owner",
				organizationId: "seed_org_beta",
				role: "OWNER",
			},
		});

		await tx.usage.upsert({
			where: { organizationId: "seed_org_alpha" },
			update: {
				periodStart: start,
				periodEnd: end,
				aiRequestsCount: 1,
				tokensUsed: 320,
			},
			create: {
				id: "seed_usage_alpha",
				organizationId: "seed_org_alpha",
				periodStart: start,
				periodEnd: end,
				aiRequestsCount: 1,
				tokensUsed: 320,
			},
		});
		await tx.usage.upsert({
			where: { organizationId: "seed_org_beta" },
			update: {
				periodStart: start,
				periodEnd: end,
				aiRequestsCount: 3,
				tokensUsed: 980,
			},
			create: {
				id: "seed_usage_beta",
				organizationId: "seed_org_beta",
				periodStart: start,
				periodEnd: end,
				aiRequestsCount: 3,
				tokensUsed: 980,
			},
		});

		await tx.project.upsert({
			where: { id: "seed_project_alpha_roadmap" },
			update: {
				organizationId: "seed_org_alpha",
				name: "Roadmap Rollout",
				description: "Coordinate product and engineering milestones for Q2.",
			},
			create: {
				id: "seed_project_alpha_roadmap",
				organizationId: "seed_org_alpha",
				name: "Roadmap Rollout",
				description: "Coordinate product and engineering milestones for Q2.",
			},
		});
		await tx.project.upsert({
			where: { id: "seed_project_alpha_ops" },
			update: {
				organizationId: "seed_org_alpha",
				name: "Ops Hardening",
				description: "Stabilize alerts, dashboards, and incident response playbooks.",
			},
			create: {
				id: "seed_project_alpha_ops",
				organizationId: "seed_org_alpha",
				name: "Ops Hardening",
				description: "Stabilize alerts, dashboards, and incident response playbooks.",
			},
		});
		await tx.project.upsert({
			where: { id: "seed_project_beta_growth" },
			update: {
				organizationId: "seed_org_beta",
				name: "Growth Funnel",
				description: "Improve onboarding conversion and activation analytics.",
			},
			create: {
				id: "seed_project_beta_growth",
				organizationId: "seed_org_beta",
				name: "Growth Funnel",
				description: "Improve onboarding conversion and activation analytics.",
			},
		});

		await tx.task.upsert({
			where: { id: "seed_task_alpha_1" },
			update: {
				organizationId: "seed_org_alpha",
				projectId: "seed_project_alpha_roadmap",
				title: "Define success metrics",
				description: "Finalize KPI baselines and owners.",
				priority: "HIGH",
				status: "INPROGRESS",
				deletedAt: null,
			},
			create: {
				id: "seed_task_alpha_1",
				organizationId: "seed_org_alpha",
				projectId: "seed_project_alpha_roadmap",
				title: "Define success metrics",
				description: "Finalize KPI baselines and owners.",
				priority: "HIGH",
				status: "INPROGRESS",
			},
		});
		await tx.task.upsert({
			where: { id: "seed_task_alpha_2" },
			update: {
				organizationId: "seed_org_alpha",
				projectId: "seed_project_alpha_ops",
				title: "Audit alert noise",
				description: "Review top 20 noisy alerts and reduce false positives.",
				priority: "MEDIUM",
				status: "ONHOLD",
				deletedAt: null,
			},
			create: {
				id: "seed_task_alpha_2",
				organizationId: "seed_org_alpha",
				projectId: "seed_project_alpha_ops",
				title: "Audit alert noise",
				description: "Review top 20 noisy alerts and reduce false positives.",
				priority: "MEDIUM",
				status: "ONHOLD",
			},
		});
		await tx.task.upsert({
			where: { id: "seed_task_beta_1" },
			update: {
				organizationId: "seed_org_beta",
				projectId: "seed_project_beta_growth",
				title: "Publish onboarding cohort report",
				description: "Ship weekly funnel report for growth standup.",
				priority: null,
				status: "DONE",
				deletedAt: null,
			},
			create: {
				id: "seed_task_beta_1",
				organizationId: "seed_org_beta",
				projectId: "seed_project_beta_growth",
				title: "Publish onboarding cohort report",
				description: "Ship weekly funnel report for growth standup.",
				priority: null,
				status: "DONE",
			},
		});

		await tx.aIRequest.upsert({
			where: { id: "seed_ai_request_alpha_1" },
			update: {
				organizationId: "seed_org_alpha",
				userId: "seed_user_owner",
				feature: "project_report",
				model: "demo-project-report-v1",
				tokensIn: 120,
				tokensOut: 200,
			},
			create: {
				id: "seed_ai_request_alpha_1",
				organizationId: "seed_org_alpha",
				userId: "seed_user_owner",
				feature: "project_report",
				model: "demo-project-report-v1",
				tokensIn: 120,
				tokensOut: 200,
			},
		});

		await tx.auditLog.upsert({
			where: { id: "seed_audit_ai_alpha_1" },
			update: {
				organizationId: "seed_org_alpha",
				actorUserId: "seed_user_owner",
				action: "ai.project_report.generate",
				targetType: "Project",
				targetId: "seed_project_alpha_roadmap",
				metadata: {
					projectId: "seed_project_alpha_roadmap",
					projectName: "Roadmap Rollout",
					model: "demo-project-report-v1",
					aiRequestId: "seed_ai_request_alpha_1",
					tokensIn: 120,
					tokensOut: 200,
					output: "Seeded report output for demo walkthroughs.",
				},
			},
			create: {
				id: "seed_audit_ai_alpha_1",
				organizationId: "seed_org_alpha",
				actorUserId: "seed_user_owner",
				action: "ai.project_report.generate",
				targetType: "Project",
				targetId: "seed_project_alpha_roadmap",
				metadata: {
					projectId: "seed_project_alpha_roadmap",
					projectName: "Roadmap Rollout",
					model: "demo-project-report-v1",
					aiRequestId: "seed_ai_request_alpha_1",
					tokensIn: 120,
					tokensOut: 200,
					output: "Seeded report output for demo walkthroughs.",
				},
			},
		});
	});

	console.log("Seed complete.");
	console.log("Users: owner.demo@example.com, admin.demo@example.com, member.demo@example.com");
	console.log("Orgs: Alpha Workspace (FREE), Beta Workspace (PRO)");
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
