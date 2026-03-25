import { SignedIn } from "@clerk/nextjs";
import Link from "next/link";
import { CubeCluster } from "@/components/CubeCluster";

export default function Home() {
	return (
		<main className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_32%),linear-gradient(180deg,_#f8fdff_0%,_#eef5ff_52%,_#f9fbff_100%)]">
			<div className="absolute inset-x-0 top-[-18rem] h-[34rem] bg-[radial-gradient(circle,_rgba(56,189,248,0.28),_transparent_62%)] blur-3xl" />
			<div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-14 px-6 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(420px,560px)] lg:px-10">
				<section className="max-w-2xl">
					<div className="inline-flex items-center rounded-full border border-cyan-200/80 bg-white/70 px-3 py-1 text-xs font-medium tracking-[0.24em] text-cyan-900 uppercase shadow-sm backdrop-blur">
						Adaptive workspace intelligence
					</div>
					<h1 className="mt-6 text-5xl leading-none font-semibold tracking-[-0.06em] text-slate-950 sm:text-6xl lg:text-7xl">
						Plan work with a system that feels alive.
					</h1>
					<p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
						Coeus keeps projects, teams, and AI-assisted execution in one place.
						The homepage asset is now a local 3D object that continuously rotates
						and reacts to pointer movement.
					</p>
					<div className="mt-8 flex flex-wrap gap-3">
						<SignedIn>
							<Link
								href="/dashboard"
								className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
							>
								Go to dashboard
							</Link>
						</SignedIn>
						<Link
							href="/sign-up"
							className="rounded-full border border-slate-300 bg-white/80 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white"
						>
							Start free
						</Link>
					</div>
				</section>
				<section className="relative flex items-center justify-center">
					<div className="absolute inset-0 rounded-[2.5rem] bg-white/30 blur-2xl" />
					<div className="relative w-full rounded-[2rem] border border-white/60 bg-white/35 p-6 shadow-[0_35px_120px_rgba(8,47,73,0.22)] backdrop-blur-sm sm:p-10">
						<CubeCluster />
					</div>
				</section>
			</div>
		</main>
	);
}
