export default function RouteLoading() {
	return (
		<main className="p-6" data-testid="route-loading">
			<div className="h-8 w-56 animate-pulse rounded bg-muted" />
			<div className="mt-3 h-4 w-96 animate-pulse rounded bg-muted" />
			<div className="mt-6 h-64 w-full animate-pulse rounded-lg border bg-muted/50" />
		</main>
	);
}
