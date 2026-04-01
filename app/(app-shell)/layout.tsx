import type { ReactNode } from "react";
import Link from "next/link";
import { getTenantCtx } from "@/features/auth/ctx";
import { listOrgMembershipsForUser } from "@/features/tenant/membership";
import OrgSwitcher from "@/components/OrgSwitcher";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarSeparator,
} from "@/components/ui/sidebar";

type AppShellLayoutProps = {
	children: ReactNode;
};

const navItems = [
	{ href: "/dashboard", label: "Dashboard" },
	{ href: "/projects", label: "Projects" },
	{ href: "/tasks", label: "Tasks" },
	{ href: "/members", label: "Members" },
	{ href: "/settings/usage", label: "Usage" },
	{ href: "/ai/project-report", label: "AI Reports" },
];

export default async function AppShellLayout({
	children,
}: AppShellLayoutProps) {
	const ctx = await getTenantCtx();
	const orgMemberships = await listOrgMembershipsForUser({
		dbUserId: ctx.dbUserId,
	});

	return (
		<div>
			<SidebarProvider>
				<Sidebar collapsible="icon">
					<SidebarHeader>
						<div className="mt-18 flex flex-col gap-5 items-start ">
							<div>
								<div className="text-xs uppercase tracking-wide text-muted-foreground">
									Workspace
								</div>
								<div className="mt-1 font-semibold">{ctx.org.name}</div>
								<div className="text-xs text-muted-foreground">
									{ctx.org.plan} · {ctx.role}
								</div>
							</div>
							<OrgSwitcher
								orgMemberships={orgMemberships}
								activeMembership={{
									organizationId: ctx.orgId,
									organization: {
										name: ctx.org.name,
										plan: ctx.org.plan,
									},
									role: ctx.role,
								}}
							/>
						</div>
					</SidebarHeader>
					<div className="h-[1px] bg-accent-foreground/10 mx-2 my-3"></div>
					<SidebarMenuItem>
						{navItems.map((item) => (
							<SidebarMenuButton key={item.href} asChild>
								<Link href={item.href} className="text-lg py-5 rounded-none">
									{item.label}
								</Link>
							</SidebarMenuButton>
						))}
					</SidebarMenuItem>
					<SidebarFooter />
				</Sidebar>

				<main className="w-full">{children}</main>
			</SidebarProvider>
		</div>
	);
}
