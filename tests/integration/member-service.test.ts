import { randomUUID } from "node:crypto";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

const runIntegration = process.env.RUN_INTEGRATION_TESTS === "1";
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration("member.service (integration)", () => {
	let prisma: (typeof import("@/lib/prisma"))["prisma"];
	let service: typeof import("@/features/member/member.service");
	const createdOrgIds = new Set<string>();
	const createdUserIds = new Set<string>();

	beforeAll(async () => {
		if (!process.env.DATABASE_URL) {
			throw new Error("DATABASE_URL is required for integration tests");
		}

		delete (globalThis as { prisma?: unknown }).prisma;
		({ prisma } = await import("@/lib/prisma"));
		service = await import("@/features/member/member.service");
	});

	afterEach(async () => {
		for (const orgId of createdOrgIds) {
			await prisma.organization.deleteMany({ where: { id: orgId } });
		}
		createdOrgIds.clear();

		for (const userId of createdUserIds) {
			await prisma.user.deleteMany({ where: { id: userId } });
		}
		createdUserIds.clear();
	});

	async function createUser(label: string) {
		const nonce = randomUUID();
		const user = await prisma.user.create({
			data: {
				clerkUserId: `clerk_${label}_${nonce}`,
				email: `${label}-${nonce}@example.test`,
				name: `${label} user`,
			},
			select: { id: true, email: true },
		});
		createdUserIds.add(user.id);
		return user;
	}

	async function seedOrgWithOwner(label: string) {
		const owner = await createUser(`${label}-owner`);
		const org = await prisma.organization.create({
			data: {
				name: `${label} org`,
				memberships: {
					create: {
						userId: owner.id,
						role: "OWNER",
					},
				},
				usage: {
					create: {
						periodStart: new Date("2026-02-01T00:00:00.000Z"),
						periodEnd: new Date("2026-03-01T00:00:00.000Z"),
					},
				},
			},
			select: { id: true },
		});
		createdOrgIds.add(org.id);

		return {
			ownerCtx: {
				dbUserId: owner.id,
				orgId: org.id,
				role: "OWNER" as const,
			},
			orgId: org.id,
			ownerUser: owner,
		};
	}

	async function addMembership(params: {
		orgId: string;
		role: "OWNER" | "ADMIN" | "MEMBER";
		label: string;
	}) {
		const user = await createUser(params.label);
		const membership = await prisma.membership.create({
			data: {
				userId: user.id,
				organizationId: params.orgId,
				role: params.role,
			},
			select: { id: true, userId: true, role: true },
		});
		return { user, membership };
	}

	it("lists only members for the requested org", async () => {
		const a = await seedOrgWithOwner("list-a");
		const b = await seedOrgWithOwner("list-b");
		await addMembership({ orgId: a.orgId, role: "ADMIN", label: "list-a-admin" });
		const bExtra = await addMembership({
			orgId: b.orgId,
			role: "MEMBER",
			label: "list-b-member",
		});

		const aMembers = await service.listMembers({ orgId: a.orgId });
		const memberIds = aMembers.map((m) => m.userId);

		expect(memberIds).toContain(a.ownerUser.id);
		expect(memberIds).not.toContain(b.ownerUser.id);
		expect(memberIds).not.toContain(bExtra.user.id);
	});

	it("adds an existing user to the current org and prevents duplicates", async () => {
		const tenant = await seedOrgWithOwner("add");
		const invited = await createUser("invitee");

		const membership = await service.addMemberToOrgByEmail(tenant.ownerCtx, {
			email: `  ${invited.email.toUpperCase()}  `,
			role: "ADMIN",
		});

		const created = await prisma.membership.findUnique({
			where: {
				userId_organizationId: {
					userId: invited.id,
					organizationId: tenant.orgId,
				},
			},
			select: { id: true, role: true },
		});
		expect(created).toMatchObject({ id: membership.id, role: "ADMIN" });

		await expect(
			service.addMemberToOrgByEmail(tenant.ownerCtx, {
				email: invited.email,
				role: "MEMBER",
			})
		).rejects.toThrow("ALREADY_MEMBER");
	});

	it("enforces OWNER-only member mutations and last-owner guard", async () => {
		const tenant = await seedOrgWithOwner("rbac");
		const admin = await addMembership({
			orgId: tenant.orgId,
			role: "ADMIN",
			label: "rbac-admin",
		});
		const member = await addMembership({
			orgId: tenant.orgId,
			role: "MEMBER",
			label: "rbac-member",
		});

		const adminCtx = {
			dbUserId: admin.user.id,
			orgId: tenant.orgId,
			role: "ADMIN" as const,
		};

		await expect(
			service.changeMemberRole(adminCtx, {
				membershipId: member.membership.id,
				role: "ADMIN",
			})
		).rejects.toThrow("FORBIDDEN");

		await expect(
			service.addMemberToOrgByEmail(adminCtx, {
				email: member.user.email,
				role: "MEMBER",
			})
		).rejects.toThrow("FORBIDDEN");

		await expect(
			service.changeMemberRole(tenant.ownerCtx, {
				membershipId: (
					await prisma.membership.findUniqueOrThrow({
						where: {
							userId_organizationId: {
								userId: tenant.ownerUser.id,
								organizationId: tenant.orgId,
							},
						},
						select: { id: true },
					})
				).id,
				role: "ADMIN",
			})
		).rejects.toThrow("LAST_OWNER");
	});

	it("allows OWNER to change another member role and writes audit logs", async () => {
		const tenant = await seedOrgWithOwner("role-update");
		const target = await addMembership({
			orgId: tenant.orgId,
			role: "MEMBER",
			label: "target",
		});

		const updated = await service.changeMemberRole(tenant.ownerCtx, {
			membershipId: target.membership.id,
			role: "ADMIN",
		});
		expect(updated.role).toBe("ADMIN");

		const logs = await prisma.auditLog.findMany({
			where: {
				organizationId: tenant.orgId,
				targetType: "Membership",
				targetId: target.membership.id,
			},
			orderBy: [{ createdAt: "asc" }],
			select: { action: true, metadata: true },
		});

		expect(logs.map((l) => l.action)).toEqual(["membership.role_update"]);
		expect(logs[0]?.metadata).toMatchObject({
			fromRole: "MEMBER",
			toRole: "ADMIN",
			userId: target.user.id,
		});
	});
});
