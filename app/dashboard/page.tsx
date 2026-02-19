import { redirect } from "next/navigation";
import { getDbUser } from "@/features/auth/getDbUser";
import { getActiveOrgId } from "@/features/tenant/activeOrg";
import getMembership from "@/features/auth/getMembership";

export default async function DashboardPage() {
	const dbUser = await getDbUser();
	console.log("dbUser", dbUser);
	const orgId = await getActiveOrgId();

	if (!orgId) redirect("/onboarding");

	const { membership } = await getMembership(dbUser, orgId);

	if (!membership) redirect("/onboarding");

	return (
		<main className="p-6">
			<h1 className="text-2xl font-semibold">Dashboard</h1>
			<div className="mt-4 rounded-lg border p-4">
				<div>Workspace: {membership.organization.name}</div>
				<div>Plan: {membership.organization.plan}</div>
				<div>Your role: {membership.role}</div>
			</div>
		</main>
	);
}
