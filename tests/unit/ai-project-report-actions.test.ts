import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TenantCtx } from "@/features/auth/ctx";

const state = vi.hoisted(() => ({
	getTenantCtx: vi.fn(),
	generateProjectStatusReport: vi.fn(),
	revalidatePath: vi.fn(),
	redirects: [] as string[],
}));

vi.mock("@/features/auth/ctx", () => ({
	getTenantCtx: state.getTenantCtx,
}));

vi.mock("@/features/ai/project-report.service", () => ({
	generateProjectStatusReport: state.generateProjectStatusReport,
}));

vi.mock("next/cache", () => ({
	revalidatePath: state.revalidatePath,
}));

vi.mock("next/navigation", () => ({
	redirect: vi.fn((url: string) => {
		state.redirects.push(url);
		throw new Error(`REDIRECT:${url}`);
	}),
}));

function makeCtx(role: TenantCtx["role"]): TenantCtx {
	return {
		dbUserId: "db_user_1",
		orgId: "org_1",
		role,
		org: { name: "Acme", plan: "FREE" },
	};
}

describe("generateProjectReportAction", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		state.redirects = [];
		state.getTenantCtx.mockResolvedValue(makeCtx("ADMIN"));
		state.generateProjectStatusReport.mockResolvedValue({ ok: true });
	});

	it("blocks MEMBER before invoking AI report service", async () => {
		const { generateProjectReportAction } = await import(
			"@/app/ai/project-report/actions"
		);
		state.getTenantCtx.mockResolvedValue(makeCtx("MEMBER"));

		const form = new FormData();
		form.set("projectId", "project_1");

		await expect(generateProjectReportAction(form)).rejects.toThrow("FORBIDDEN");
		expect(state.generateProjectStatusReport).not.toHaveBeenCalled();
	});

	it("generates report, revalidates pages, and redirects on success", async () => {
		const { generateProjectReportAction } = await import(
			"@/app/ai/project-report/actions"
		);

		const form = new FormData();
		form.set("projectId", "project_1");

		await expect(generateProjectReportAction(form)).rejects.toThrow(
			"REDIRECT:/ai/project-report?result=success"
		);

		expect(state.getTenantCtx).toHaveBeenCalledWith({
			authRedirectTo: "/ai/project-report",
		});
		expect(state.generateProjectStatusReport).toHaveBeenCalledWith(makeCtx("ADMIN"), {
			projectId: "project_1",
		});
		expect(state.revalidatePath).toHaveBeenCalledWith("/ai/project-report");
		expect(state.revalidatePath).toHaveBeenCalledWith("/settings/usage");
	});

	it("redirects usage-limit failures to a user-facing message", async () => {
		const { generateProjectReportAction } = await import(
			"@/app/ai/project-report/actions"
		);
		state.generateProjectStatusReport.mockRejectedValueOnce(
			new Error("USAGE_LIMIT_EXCEEDED")
		);

		const form = new FormData();
		form.set("projectId", "project_1");

		await expect(generateProjectReportAction(form)).rejects.toThrow(
			"REDIRECT:/ai/project-report?error=usage-limit"
		);
		expect(state.redirects).toContain("/ai/project-report?error=usage-limit");
		expect(state.revalidatePath).not.toHaveBeenCalled();
	});

	it("redirects provider failures to a user-facing message", async () => {
		const { generateProjectReportAction } = await import(
			"@/app/ai/project-report/actions"
		);
		state.generateProjectStatusReport.mockRejectedValueOnce(
			new Error("AI_PROVIDER_ERROR:GEMINI_HTTP_401")
		);

		const form = new FormData();
		form.set("projectId", "project_1");

		await expect(generateProjectReportAction(form)).rejects.toThrow(
			"REDIRECT:/ai/project-report?error=provider"
		);
		expect(state.redirects).toContain("/ai/project-report?error=provider");
		expect(state.revalidatePath).not.toHaveBeenCalled();
	});
});
