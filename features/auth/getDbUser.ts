import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getE2EBypassDbUserId } from "./e2eBypass";

export async function getDbUser() {
  const bypassDbUserId = await getE2EBypassDbUserId();
  if (bypassDbUserId) {
    const dbUser = await prisma.user.findUnique({ where: { id: bypassDbUserId } });
    if (!dbUser) throw new Error("E2E_BYPASS_USER_NOT_FOUND");
    return dbUser;
  }

  const user = await currentUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const primaryEmail =
    user.emailAddresses.find(
      (emailAddress) => emailAddress.id === user.primaryEmailAddressId
    ) ?? user.emailAddresses[0];

  const email = primaryEmail?.emailAddress;
  if (!email) throw new Error("NO_EMAIL");

  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || null;

  return prisma.user.upsert({
    where: { clerkUserId: user.id },
    update: { email, name, image: user.imageUrl },
    create: { clerkUserId: user.id, email, name, image: user.imageUrl },
  });
}
