import React from "react";
import Link from "next/link";
import { selectOrgAction } from "@/app/org/select/actions";
import { OrgRole, Plan } from "@/generated/prisma/browser";

type OrgSwitcherProps = {
	orgMemberships: {
		organization: {
			name: string;
			plan: Plan;
		};
		organizationId: string;
		role: OrgRole;
	}[];
	activeMembership: {
		role: OrgRole;
		organization: {
			name: string;
			plan: Plan;
		};
		organizationId: string;
	} | null;
};

export default function OrgSwitcher({
	orgMemberships,
	activeMembership,
}: {
	orgMemberships: OrgSwitcherProps["orgMemberships"];
	activeMembership: OrgSwitcherProps["activeMembership"];
}) {
	return (
		<details className="relative">
			<summary className="list-none cursor-pointer rounded-md border px-3 py-2 text-sm select-none">
				{activeMembership
					? `Org: ${activeMembership.organization.name}`
					: "Switch org"}
			</summary>
			<div className="absolute right-0 mt-2 w-72 rounded-lg border bg-background p-2 shadow-lg">
				<div className="px-2 pb-2 text-xs text-muted-foreground">
					Switch workspace
				</div>
				<div className="space-y-1">
					{orgMemberships.map((membership) => {
						const isActive =
							membership.organizationId === activeMembership?.organizationId;
						return (
							<form key={membership.organizationId} action={selectOrgAction}>
								<input
									type="hidden"
									name="orgId"
									value={membership.organizationId}
								/>
								<button
									type="submit"
									className={`w-full rounded-md border px-3 py-2 text-left text-sm cursor-pointer ${
										isActive ? "bg-muted" : "hover:bg-foreground/2"
									}`}
								>
									<div className="font-medium">
										{membership.organization.name}
									</div>
									<div className="text-xs text-muted-foreground">
										{membership.organization.plan} · {membership.role}
										{isActive ? " · Active" : ""}
									</div>
								</button>
							</form>
						);
					})}
				</div>
				<Link
					href="/org/select"
					className="mt-2 block rounded-md px-2 py-2 text-xs text-muted-foreground hover:bg-muted"
				>
					Open full org selector
				</Link>
			</div>
		</details>
	);
}
