"use client";
import React from "react";
import Link from "next/link";
import { selectOrgAction } from "@/app/org/select/actions";
import { OrgRole, Plan } from "@/generated/prisma/browser";
import {
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenu,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from "./ui/sidebar";
import { Check, ChevronsUpDown } from "lucide-react";

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
	const { isMobile } = useSidebar();
	return (
		<SidebarMenuItem className="relative" data-testid="org-switcher">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<SidebarMenuButton
						size="lg"
						data-testid="org-switcher-trigger"
						className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
					>
						<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
							<div className="size-4 bg-primary" />
						</div>
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-medium">
								{activeMembership
									? `Org: ${activeMembership.organization.name}`
									: "Switch org"}
							</span>
							<span className="truncate text-xs">
								{activeMembership?.organization.plan} · {activeMembership?.role}
							</span>
						</div>
						<ChevronsUpDown className="ml-auto" />
					</SidebarMenuButton>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					data-testid="org-switcher-menu"
					className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
					align="start"
					side={isMobile ? "bottom" : "right"}
					sideOffset={4}
				>
					<DropdownMenuGroup>
						<DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
					</DropdownMenuGroup>
					<DropdownMenuSeparator />
					<DropdownMenuGroup className="space-y-1">
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
										className={`flex w-full items-start justify-between rounded-md border px-3 py-2 text-left text-sm ${
											isActive ? "bg-muted" : "hover:bg-accent"
										}`}
									>
										<div>
											<div className="font-medium">
												{membership.organization.name}
											</div>
											<div className="text-xs text-muted-foreground">
												{membership.organization.plan} · {membership.role}
												{isActive ? " · Active" : ""}
											</div>
										</div>
										{isActive ? (
											<Check className="mt-0.5 size-4 text-muted-foreground" />
										) : null}
									</button>
								</form>
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
		</SidebarMenuItem>
	);
}
