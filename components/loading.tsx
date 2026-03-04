export default function RootLoading() {
	return (
		<main className="p-6" data-testid="app-loading">
			<div className="h-8 w-56 animate-pulse rounded bg-muted" />
			<div className="mt-3 h-4 w-80 animate-pulse rounded bg-muted" />
			<div className="mt-6 space-y-3">
				<div className="h-24 w-full animate-pulse rounded-lg border bg-muted/50" />
				<div className="h-24 w-full animate-pulse rounded-lg border bg-muted/50" />
			</div>
		</main>
	);
}
