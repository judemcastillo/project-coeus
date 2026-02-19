import { SignUp } from "@clerk/nextjs";

export default function Page() {
	return (
		<SignUp
			appearance={{
				elements: {
					card: "bg-background",
				},
			}}
			routing="path"
			path="/sign-up"
		/>
	);
}
