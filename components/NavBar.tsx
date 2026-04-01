import Link from "next/link";
import { Bell, Settings, User } from "lucide-react";
import { ModeToggle } from "./ModeToggle";
import {
	ClerkProvider,
	SignInButton,
	SignUpButton,
	SignedIn,
	SignedOut,
	UserButton,
} from "@clerk/nextjs";
import { Button } from "./ui/button";

export function Navbar() {
	return (
		<header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/80 backdrop-blur-md">
			<div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
				<div className="flex items-center gap-10">
					<Link href="/" className="flex items-center gap-2">
						<span className="text-xl font-bold tracking-tight text-foreground">
							Coeus
						</span>
					</Link>
				</div>

				<div className="flex items-center gap-5 ">
					<div className="flex items-center gap-2 ">
						<ModeToggle />
						<Button variant={"ghost"} size={"icon"}>
							<Bell className="h-4 w-4" />
						</Button>
						<Button variant={"ghost"} size={"icon"}>
							<Settings className="h-4 w-4" />
						</Button>
					</div>

					<SignedOut>
						<SignInButton>
							<Button className="text-xs   rounded-3xl cursor-pointer">
								Sign In
							</Button>
						</SignInButton>
						<SignUpButton>
							<Button className="text-xs   rounded-3xl cursor-pointer">
								Sign Up
							</Button>
						</SignUpButton>
					</SignedOut>
					{/* Show the user button when the user is signed in */}
					<SignedIn>
						<UserButton />
					</SignedIn>
				</div>
			</div>
		</header>
	);
}
