import type { Ctx } from "@/features/auth/ctx";

export function requireRole(ctx: Ctx, allowed: Array<Ctx["role"]>) {
  if (!allowed.includes(ctx.role)) throw new Error("FORBIDDEN");
}

export function requireAdmin(ctx: Ctx) {
  requireRole(ctx, ["OWNER", "ADMIN"]);
}

export function requireOwner(ctx: Ctx) {
  requireRole(ctx, ["OWNER"]);
}