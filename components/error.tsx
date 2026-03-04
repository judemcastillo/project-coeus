"use client";

import { useEffect } from "react";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<html>
			<body>
				<main className="p-6" data-testid="app-error">
					<div className="mx-auto max-w-2xl rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
						<h1 className="text-xl font-semibold">Something went wrong</h1>
						<p className="mt-2 text-sm">
							An unexpected error occurred while loading this workspace page.
						</p>
						<button
							type="button"
							onClick={() => reset()}
							className="mt-4 rounded-md border border-red-500 bg-white px-3 py-2 text-sm"
						>
							Try again
						</button>
					</div>
				</main>
			</body>
		</html>
	);
}
