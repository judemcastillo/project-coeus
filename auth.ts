import "server-only";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const credentialsSchema = z.object({
	email: z.string().email(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
	adapter: PrismaAdapter(prisma),
	session: { strategy: "jwt" },
	providers: [
		Credentials({
			name: "Dev Login",
			credentials: {
				email: { label: "Email", type: "email" },
			},
			async authorize(rawCredentials) {
				const parsed = credentialsSchema.safeParse(rawCredentials);
				if (!parsed.success) return null;

				const { email } = parsed.data;

				const user = await prisma.user.upsert({
					where: { email },
					update: {},
					create: { email },
				});

				return user;
			},
		}),
	],
});
