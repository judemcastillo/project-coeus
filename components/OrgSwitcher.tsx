import React from "react";
import Link from "next/link";
import { selectOrgAction } from "@/app/org/select/actions";
import { OrgRole, Plan } from "@/generated/prisma/browser";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";

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
		<div className="relative" data-testid="org-switcher">
			{/* <summary
				data-testid="org-switcher-trigger"
				className="list-none cursor-pointer rounded-md border px-3 py-2 text-sm select-none"
			>
				{activeMembership
					? `Org: ${activeMembership.organization.name}`
					: "Switch org"}
			</summary>
			<div
				data-testid="org-switcher-menu"
				className="absolute right-0 mt-2 w-72 rounded-lg border bg-background p-2 shadow-lg"
			>
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
									data-testid={`org-switch-option-${membership.organizationId}`}
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
			</div> */}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant={"outline"} size={"sm"} data-testid="org-switcher-trigger" className="px-4 py-3 bg-accent-foreground/15">
						{activeMembership
							? `Org: ${activeMembership.organization.name}`
							: "Switch org"}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuGroup>
						<DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
					</DropdownMenuGroup>
					<DropdownMenuSeparator />
					<DropdownMenuGroup className="space-y-1">
						{orgMemberships.map((membership) => {
							const isActive =
								membership.organizationId === activeMembership?.organizationId;
							return (
								<DropdownMenuCheckboxItem
									key={membership.organizationId}
									className={`w-full rounded-md border pl-3 py-2 text-left text-sm cursor-pointer ${
										isActive ? "bg-muted" : "hover:bg-foreground/2"
									}`}
								>
									<form action={selectOrgAction}>
										<input
											type="hidden"
											name="orgId"
											value={membership.organizationId}
										/>
										<button
											type="submit"
											data-testid={`org-switch-option-${membership.organizationId}`}
										>
											<div className="font-medium text-left">
												{membership.organization.name}
											</div>
											<div className="text-xs text-muted-foreground">
												{membership.organization.plan} · {membership.role}
												{isActive ? " · Active" : ""}
											</div>
										</button>
									</form>
									<DropdownMenuCheckboxItem checked={isActive} />
								</DropdownMenuCheckboxItem>
							);
						})}
					</DropdownMenuGroup>
					<DropdownMenuSeparator />
					<DropdownMenuGroup>
						<DropdownMenuLabel>
							<Link
								href="/org/select"
								className=" text-xs text-muted-foreground hover:text-secondary-foreground"
							>
								Open full org selector
							</Link>
						</DropdownMenuLabel>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
