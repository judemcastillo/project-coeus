import { redirect } from "next/navigation";
import { requireAuth } from "@/features/auth/requireAuth";
import { getActiveOrgId } from "@/features/tenant/activeOrg";
import { getDbUser } from "@/features/auth/getDbUser";
import { hasOrgMembership } from "@/features/tenant/membership";
import { createOrgAction } from "./actions";

export default async function OnboardingPage() {
	await requireAuth("/onboarding");

	const activeOrgId = await getActiveOrgId();
	if (activeOrgId) {
		const dbUser = await getDbUser();
		const hasMembership = await hasOrgMembership({
			dbUserId: dbUser.id,
			orgId: activeOrgId,
		});
		if (hasMembership) redirect("/dashboard");
		redirect("/onboarding/recover-active-org");
	}

	return (
		<main className="mx-auto max-w-md p-6">
			<h1 className="text-2xl font-semibold">Create your workspace</h1>
			<p className="mt-2 text-sm text-muted-foreground">
				This is where your team’s projects and AI reports will live.
			</p>

			<form action={createOrgAction} className="mt-6 space-y-4">
				<input
					name="orgName"
					placeholder="Acme Inc."
					className="w-full rounded-md border px-3 py-2"
				/>
				<button className="w-full rounded-md border px-3 py-2">
					Create workspace
				</button>
			</form>
		</main>
	);
}
