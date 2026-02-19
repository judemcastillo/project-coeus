import { SignedIn } from "@clerk/nextjs";
import Image from "next/image";

export default function Home() {
	return (
		<div className="flex  flex-col min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
			<h1>Welcome to Coeus</h1>
			<SignedIn>
				<a href="/dashboard" className="mt-4 rounded-md border px-3 py-2">
					Go to dashboard
				</a>
			</SignedIn>
		</div>
	);
}
