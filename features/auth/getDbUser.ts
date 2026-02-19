import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function getDbUser() {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const email = user.emailAddresses[0]?.emailAddress;
  if (!email) throw new Error("NO_EMAIL");

  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || null;

  return prisma.user.upsert({
    where: { clerkUserId: user.id },
    update: { email, name, image: user.imageUrl },
    create: { clerkUserId: user.id, email, name, image: user.imageUrl },
  });
}
