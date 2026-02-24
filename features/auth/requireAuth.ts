import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getE2EBypassDbUserId } from "./e2eBypass";

export async function requireAuth(redirectTo = "/") {
	const bypassDbUserId = await getE2EBypassDbUserId();
	if (bypassDbUserId) {
		return { clerkUserId: `e2e:${bypassDbUserId}` };
	}

	const { userId } = await auth();

	if (!userId) {
		redirect(`/sign-in?redirect_url=${encodeURIComponent(redirectTo)}`);
	}

	return { clerkUserId: userId };
}
