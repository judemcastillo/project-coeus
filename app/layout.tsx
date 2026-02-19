import type { Metadata } from "next";
import {
	ClerkProvider,
	SignInButton,
	SignUpButton,
	SignedIn,
	SignedOut,
	UserButton,
} from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Coeus",
	description: "AI workspace for teams",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<ClerkProvider
			appearance={{
				elements: {
					card: "shadow-xl border rounded-xl",
					headerTitle: "text-2xl font-semibold",
					headerSubtitle: "text-muted-foreground",
					formButtonPrimary: "bg-black hover:bg-black/90 text-white rounded-md",
					formFieldInput:
						"rounded-md border border-input bg-background px-3 py-2 text-sm",
					footerActionLink: "text-primary hover:underline",
				},
			}}
			signInUrl="/sign-in"
			signUpUrl="/sign-up"
			afterSignInUrl="/onboarding"
			afterSignUpUrl="/onboarding"
		>
			<html lang="en">
				<body
					className={`${geistSans.variable} ${geistMono.variable} antialiased`}
				>
					<header className="flex justify-end items-center p-4 gap-4 h-16">
						{/* Show the sign-in and sign-up buttons when the user is signed out */}
						<SignedOut>
							<SignInButton>
								<button className="bg-blue-950 text-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer">
									Sign In
								</button>
							</SignInButton>
							<SignUpButton>
								<button className="bg-blue-950 text-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer">
									Sign Up
								</button>
							</SignUpButton>
						</SignedOut>
						{/* Show the user button when the user is signed in */}
						<SignedIn>
							<UserButton />
						</SignedIn>
					</header>
					{children}
				</body>
			</html>
		</ClerkProvider>
	);
}
