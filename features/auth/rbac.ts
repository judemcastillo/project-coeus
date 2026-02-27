import type { TenantCtx } from "@/features/auth/ctx";

type RoleCtx = Pick<TenantCtx, "role">;

export function requireRole(
	ctx: RoleCtx,
	allowed: Array<TenantCtx["role"]>
) {
  if (!allowed.includes(ctx.role)) throw new Error("FORBIDDEN");
}

export function requireAdmin(ctx: RoleCtx) {
  requireRole(ctx, ["OWNER", "ADMIN"]);
}

export function requireOwner(ctx: RoleCtx) {
  requireRole(ctx, ["OWNER"]);
}
