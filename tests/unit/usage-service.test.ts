import { describe, expect, it } from "vitest";
import {
	AI_REQUEST_LIMITS,
	getAiRequestLimitForPlan,
	monthPeriod,
} from "@/features/usage/usage.service";

describe("usage.service (unit)", () => {
	it("returns plan-specific AI request limits", () => {
		expect(AI_REQUEST_LIMITS.FREE).toBeGreaterThan(0);
		expect(AI_REQUEST_LIMITS.PRO).toBeGreaterThan(AI_REQUEST_LIMITS.FREE);
		expect(getAiRequestLimitForPlan("FREE")).toBe(AI_REQUEST_LIMITS.FREE);
		expect(getAiRequestLimitForPlan("PRO")).toBe(AI_REQUEST_LIMITS.PRO);
	});

	it("computes UTC month boundaries", () => {
		const now = new Date("2026-02-15T12:34:56.000Z");
		const { start, end } = monthPeriod(now);

		expect(start.toISOString()).toBe("2026-02-01T00:00:00.000Z");
		expect(end.toISOString()).toBe("2026-03-01T00:00:00.000Z");
	});
});
