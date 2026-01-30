import { getCtx } from "@/features/auth/ctx";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
	const ctx = await getCtx();

	const org = await prisma.organization.findUnique({
		where: { id: ctx.orgId },
		select: { name: true, plan: true },
	});

	return (
		<main className="p-6">
			<h1 className="text-2xl font-semibold">Dashboard</h1>
			<div className="mt-4 rounded-lg border p-4">
				<div>Org: {org?.name}</div>
				<div>Plan: {org?.plan}</div>
				<div>Your role: {ctx.role}</div>
			</div>
		</main>
	);
}
