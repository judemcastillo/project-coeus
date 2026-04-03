import type { ReactNode } from "react";
import Link from "next/link";
import { getTenantCtx } from "@/features/auth/ctx";
import { listOrgMembershipsForUser } from "@/features/tenant/membership";
import OrgSwitcher from "@/components/OrgSwitcher";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarInset,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import {
	ChartColumnBig,
	FolderKanban,
	FolderOpen,
	LayoutDashboard,
	Sparkle,
	Users,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

type AppShellLayoutProps = {
	children: ReactNode;
};

const navItems = [
	{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
	{ href: "/projects", label: "Projects", icon: FolderKanban },
	{ href: "/tasks", label: "Tasks", icon: FolderOpen },
	{ href: "/members", label: "Members", icon: Users },
	{ href: "/settings/usage", label: "Usage", icon: ChartColumnBig },
	{ href: "/ai/project-report", label: "AI Reports", icon: Sparkle },
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
				<Sidebar collapsible="icon" className="relative">
					<SidebarHeader>
						<SidebarMenuItem>
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
						</SidebarMenuItem>
					</SidebarHeader>
					<div className="h-px bg-accent-foreground/10 mx-2 my-3"></div>
					<SidebarContent>
						{navItems.map((item) => (
							<SidebarMenuItem key={item.href} className="px-3">
								<Link href={item.href}>
									<SidebarMenuButton
										tooltip={item.label}
										className="m-auto text-sm py-3 h-fit cursor-pointer"
									>
										{item.icon && <item.icon />}

										<span>{item.label}</span>
									</SidebarMenuButton>
								</Link>
							</SidebarMenuItem>
						))}
					</SidebarContent>
					<SidebarFooter />
				</Sidebar>

				<main className="w-full">
					<SidebarInset>
						<header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
							<SidebarTrigger className="-ml-1 ml-4" />
							<Separator
								orientation="vertical"
								className="mr-2 data-[orientation=vertical]:h-4"
							/>
						</header>
						{children}
					</SidebarInset>
				</main>
			</SidebarProvider>
		</div>
	);
}
