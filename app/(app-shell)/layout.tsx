import type { ReactNode } from "react";
import Link from "next/link";
import { getTenantCtx } from "@/features/auth/ctx";
import { listOrgMembershipsForUser } from "@/features/tenant/membership";
import OrgSwitcher from "@/components/OrgSwitcher";

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

export default async function AppShellLayout({ children }: AppShellLayoutProps) {
	const ctx = await getTenantCtx();
	const orgMemberships = await listOrgMembershipsForUser({ dbUserId: ctx.dbUserId });

	return (
		<div className="min-h-screen bg-background md:grid md:grid-cols-[260px_1fr]">
			<aside className="border-r bg-muted/10 p-4">
				<div>
					<div className="text-xs uppercase tracking-wide text-muted-foreground">
						Workspace
					</div>
					<div className="mt-1 font-semibold">{ctx.org.name}</div>
					<div className="text-xs text-muted-foreground">
						{ctx.org.plan} · {ctx.role}
					</div>
				</div>

				<div className="mt-4">
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

				<nav className="mt-6 space-y-1">
					{navItems.map((item) => (
						<Link
							key={item.href}
							href={item.href}
							className="block rounded-md border px-3 py-2 text-sm hover:bg-muted"
						>
							{item.label}
						</Link>
					))}
				</nav>
			</aside>

			<div className="min-w-0">{children}</div>
		</div>
	);
}
