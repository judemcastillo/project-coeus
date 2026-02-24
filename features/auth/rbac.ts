import type { TenantCtx } from "@/features/auth/ctx";

export function requireRole(
	ctx: TenantCtx,
	allowed: Array<TenantCtx["role"]>
) {
  if (!allowed.includes(ctx.role)) throw new Error("FORBIDDEN");
}

export function requireAdmin(ctx: TenantCtx) {
  requireRole(ctx, ["OWNER", "ADMIN"]);
}

export function requireOwner(ctx: TenantCtx) {
  requireRole(ctx, ["OWNER"]);
}
