import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const runIntegration = process.env.RUN_INTEGRATION_TESTS === "1";
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration("createOrgForUser (integration)", () => {
	let prisma: (typeof import("@/lib/prisma"))["prisma"];
	let createOrgForUser: typeof import("@/features/org/org.service")["createOrgForUser"];
	let createdUserId: string | null = null;
	let createdOrgId: string | null = null;

	beforeAll(async () => {
		if (!process.env.DATABASE_URL) {
			throw new Error("DATABASE_URL is required for integration tests");
		}

		// Ensure the Prisma singleton initializes against the current test env.
		delete (globalThis as { prisma?: unknown }).prisma;

		({ prisma } = await import("@/lib/prisma"));
		({ createOrgForUser } = await import("@/features/org/org.service"));
	});

	afterAll(async () => {
		if (!prisma) return;

		if (createdOrgId) {
			await prisma.organization.deleteMany({ where: { id: createdOrgId } });
		}

		if (createdUserId) {
			await prisma.user.deleteMany({ where: { id: createdUserId } });
		}
	});

	it("creates org, owner membership, usage row, and audit log", async () => {
		const nonce = randomUUID();
		const email = `integration-${nonce}@example.test`;

		const user = await prisma.user.create({
			data: {
				clerkUserId: `clerk_${nonce}`,
				email,
				name: "Integration User",
			},
			select: { id: true },
		});
		createdUserId = user.id;

		const org = await createOrgForUser({
			userId: user.id,
			name: "Acme Integration",
		});
		createdOrgId = org.id;

		const persisted = await prisma.organization.findUnique({
			where: { id: org.id },
			select: {
				id: true,
				name: true,
				memberships: {
					where: { userId: user.id },
					select: { role: true },
				},
				usage: {
					select: {
						periodStart: true,
						periodEnd: true,
						aiRequestsCount: true,
						tokensUsed: true,
					},
				},
				auditLogs: {
					where: { action: "org.create", actorUserId: user.id },
					select: { action: true, targetType: true, metadata: true },
				},
			},
		});

		expect(persisted).not.toBeNull();
		expect(persisted?.name).toBe("Acme Integration");
		expect(persisted?.memberships).toHaveLength(1);
		expect(persisted?.memberships[0]?.role).toBe("OWNER");

		expect(persisted?.usage).toBeTruthy();
		expect(persisted?.usage?.aiRequestsCount).toBe(0);
		expect(persisted?.usage?.tokensUsed).toBe(0);
		expect(persisted?.usage?.periodStart.getTime()).toBeLessThan(
			persisted?.usage?.periodEnd.getTime() ?? 0
		);

		expect(persisted?.auditLogs).toHaveLength(1);
		expect(persisted?.auditLogs[0]?.action).toBe("org.create");
		expect(persisted?.auditLogs[0]?.targetType).toBe("Organization");
		expect(persisted?.auditLogs[0]?.metadata).toMatchObject({
			name: "Acme Integration",
		});
	});
});
