import { redirect } from "next/navigation";
import { requireAuth } from "@/features/auth/requireAuth";
import { getDbUser } from "@/features/auth/getDbUser";
import { listOrgMembershipsForUser } from "@/features/tenant/membership";
import { selectOrgAction } from "./actions";

export default async function OrgSelectPage() {
	await requireAuth("/org/select");
	const dbUser = await getDbUser();
	const memberships = await listOrgMembershipsForUser({ dbUserId: dbUser.id });

	if (memberships.length === 0) redirect("/onboarding");
	if (memberships.length === 1) redirect("/org/select/auto");

	return (
		<main className="mx-auto max-w-2xl p-6">
			<h1 className="text-2xl font-semibold">Select a workspace</h1>
			<p className="mt-2 text-sm text-muted-foreground">
				Choose which organization you want to work in.
			</p>

			<div className="mt-6 space-y-3">
				{memberships.map((membership) => (
					<form
						key={membership.organizationId}
						action={selectOrgAction}
						className="rounded-lg border p-4 flex items-center justify-between gap-4"
					>
						<input type="hidden" name="orgId" value={membership.organizationId} />
						<div>
							<div className="font-medium">{membership.organization.name}</div>
							<div className="text-sm text-muted-foreground">
								Plan: {membership.organization.plan} · Role: {membership.role}
							</div>
						</div>
						<button className="rounded-md border px-3 py-2 text-sm">
							Open
						</button>
					</form>
				))}
			</div>
		</main>
	);
}
