"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createOrganizationForUser } from "@/features/org/org.service";

const schema = z.object({
  orgName: z.string().min(2).max(60),
});

export async function createOrgAction(formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("UNAUTHORIZED");

  const { orgName } = schema.parse({
    orgName: formData.get("orgName"),
  });

  await createOrganizationForUser({ userId, orgName });
  redirect("/dashboard");
}