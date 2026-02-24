import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	clearActiveOrgId: vi.fn(),
}));

vi.mock("@/features/tenant/activeOrg", () => ({
	clearActiveOrgId: mocks.clearActiveOrgId,
}));

describe("onboarding recover-active-org route", () => {
	it("clears the active org cookie and redirects to /onboarding", async () => {
		const { GET } = await import("@/app/onboarding/recover-active-org/route");

		const response = await GET(
			new Request("http://localhost:3000/onboarding/recover-active-org")
		);

		expect(mocks.clearActiveOrgId).toHaveBeenCalledTimes(1);
		expect(response.status).toBe(307);
		expect(response.headers.get("location")).toBe("http://localhost:3000/onboarding");
	});
});
