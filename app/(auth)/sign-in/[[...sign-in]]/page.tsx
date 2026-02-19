import { SignIn } from "@clerk/nextjs";

export default function Page() {
	return (
		<SignIn
			appearance={{
				elements: {
					card: "bg-background",
				},
			}}
			routing="path"
			path="/sign-in"
		/>
	);
}
