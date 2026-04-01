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
import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/ModeToggle";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/NavBar";


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

export default async function RootLayout({
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
					<ThemeProvider
						attribute="class"
						defaultTheme="system"
						enableSystem
						disableTransitionOnChange
					>
						<Navbar />
						{children}
					</ThemeProvider>
				</body>
			</html>
		</ClerkProvider>
	);
}
