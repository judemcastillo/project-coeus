import { SignedIn } from "@clerk/nextjs";
import Link from "next/link";
import { CubeCluster } from "@/components/CubeCluster";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Aperture, ArrowRight, BarChart2, Scale } from "lucide-react";

export default function Home() {
	return (
		<main className="relative min-h-[calc(100vh-4rem)] overflow-hidden ">
			<div className="relative mx-auto flex flex-col min-h-[calc(100vh-4rem)] max-w-8xl items-center gap-14 px-6   lg:px-10">
				<section className="relative  grid  max-w-7xl items-center gap-14 px-6 py-16  lg:grid-cols-[minmax(0,1fr)_minmax(420px,560px)] ">
					<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
						<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-foreground ">
							Architect the Future of <br />
							<span className="text-primary">Collective Intelligence.</span>
						</h1>

						<p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl leading-relaxed">
							Coeus is a high-dimensional project operating system that predicts
							bottlenecks before they happen. Minimalist design meets maximum
							performance.
						</p>
						<div className="flex flex-col sm:flex-row items-center gap-4">
							<SignedIn>
								<Link href="/dashboard">
									<Button
										className="text-lg p-7 cursor-pointer "
										variant={"default"}
									>
										Go to dashboard
									</Button>
								</Link>
							</SignedIn>
							<Link href="/sign-up">
								<Button
									className="text-lg p-7 cursor-pointer "
									variant={"secondary"}
								>
									Get Started with Coeus
								</Button>
							</Link>
						</div>
					</div>
					<Card className="relative flex items-center justify-center">
						<CubeCluster />
					</Card>
				</section>

				{/* Features Section */}
				<section className="py-14 lg:py-20 border-b border-border/50 relative w-full">
					<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
						<div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
							<div className="max-w-2xl">
								<h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
									System Capabilities
								</h2>
								<p className="text-muted-foreground text-lg">
									Our neural engine handles the complexity so you can focus on
									the vision.
								</p>
							</div>
							<div className="text-5xl md:text-7xl font-black tracking-tighter text-foreground/40">
								01 // CORE
							</div>
						</div>

						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
							{/* Card 1: Predictive Analytics */}
							<div className="lg:col-span-2 rounded-2xl border border-border bg-card p-8 md:p-10 flex flex-col justify-between min-h-[320px] relative overflow-hidden group shadow-sm">
								<div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
								<div className="relative z-10">
									<div className="h-10 w-10 rounded-lg bg-muted border border-border flex items-center justify-center mb-8">
										<BarChart2 className="h-5 w-5 text-blue-500 dark:text-blue-400" />
									</div>
									<h3 className="text-2xl font-bold text-foreground mb-4">
										Predictive Analytics
									</h3>
									<p className="text-muted-foreground max-w-md leading-relaxed">
										Our proprietary models analyze velocity, complexity, and
										historical trends to forecast completion dates with 98%
										accuracy.
									</p>
								</div>
								<div className="mt-12 flex gap-2 relative z-10">
									<div className="h-1 w-1/3 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
									<div className="h-1 w-1/3 bg-muted-foreground/20 rounded-full"></div>
									<div className="h-1 w-1/3 bg-muted-foreground/20 rounded-full"></div>
								</div>
							</div>

							{/* Card 2: Automated Balancing */}
							<div className="lg:col-span-1 rounded-2xl border border-border bg-card p-8 md:p-10 flex flex-col justify-between min-h-[320px] relative overflow-hidden group shadow-sm">
								<div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
								<div className="relative z-10">
									<div className="h-10 w-10 rounded-lg bg-muted border border-border flex items-center justify-center mb-8">
										<Scale className="h-5 w-5 text-orange-500 dark:text-orange-400" />
									</div>
									<h3 className="text-2xl font-bold text-foreground mb-4">
										Automated Balancing
									</h3>
									<p className="text-muted-foreground text-sm leading-relaxed">
										Dynamic workload redistribution prevents team burnout. Coeus
										adjusts task priority in real-time based on member capacity.
									</p>
								</div>
								<div className="mt-10 rounded-xl bg-muted/50 dark:bg-black/40 p-4 border border-border relative z-10">
									<div className="flex justify-between text-[10px] font-bold tracking-wider text-muted-foreground mb-3">
										<span>TEAM LOAD</span>
										<span className="text-orange-500 dark:text-orange-400">
											OPTIMIZED
										</span>
									</div>
									<div className="flex gap-1.5">
										<div className="h-6 flex-1 bg-muted-foreground/20 rounded-sm"></div>
										<div className="h-6 flex-1 bg-muted-foreground/20 rounded-sm"></div>
										<div className="h-6 flex-1 bg-orange-500/80 dark:bg-orange-400/80 rounded-sm"></div>
										<div className="h-6 flex-1 bg-muted-foreground/20 rounded-sm"></div>
									</div>
								</div>
							</div>

							{/* Card 3: Real-time Team Insights */}
							<div className="lg:col-span-3 rounded-2xl border border-border bg-card p-8 md:p-10 flex flex-col md:flex-row justify-between items-center gap-12 relative overflow-hidden group shadow-sm">
								<div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
								<div className="flex-1 relative z-10">
									<div className="h-10 w-10 rounded-lg bg-muted border border-border flex items-center justify-center mb-8">
										<Aperture className="h-5 w-5 text-foreground" />
									</div>
									<h3 className="text-2xl font-bold text-foreground mb-4">
										Real-time Team Insights
									</h3>
									<p className="text-muted-foreground max-w-xl mb-8 leading-relaxed">
										Visualize the invisible threads of collaboration. Understand
										how your team actually works—not just what they report.
										Reveal hidden dependencies and expertise silos instantly.
									</p>
									<Link
										href="#"
										className="inline-flex items-center text-sm font-semibold text-foreground hover:text-primary transition-colors"
									>
										Explore the engine <ArrowRight className="ml-2 h-4 w-4" />
									</Link>
								</div>
								<div className="w-full md:w-[400px] rounded-xl bg-muted/50 dark:bg-black/40 p-6 border border-border space-y-5 relative z-10">
									<div className="flex items-center gap-4">
										<div className="h-8 w-8 rounded-full bg-muted-foreground/20 flex items-center justify-center text-[10px] font-bold text-foreground">
											JD
										</div>
										<div className="flex-1 h-1.5 bg-muted-foreground/10 rounded-full overflow-hidden">
											<div className="h-full bg-blue-500 dark:bg-blue-400 w-[75%] rounded-full"></div>
										</div>
									</div>
									<div className="flex items-center gap-4">
										<div className="h-8 w-8 rounded-full bg-muted-foreground/20 flex items-center justify-center text-[10px] font-bold text-foreground">
											AS
										</div>
										<div className="flex-1 h-1.5 bg-muted-foreground/10 rounded-full overflow-hidden">
											<div className="h-full bg-indigo-500 dark:bg-indigo-400 w-[45%] rounded-full"></div>
										</div>
									</div>
									<div className="flex items-center gap-4">
										<div className="h-8 w-8 rounded-full bg-muted-foreground/20 flex items-center justify-center text-[10px] font-bold text-foreground">
											MK
										</div>
										<div className="flex-1 h-1.5 bg-muted-foreground/10 rounded-full overflow-hidden">
											<div className="h-full bg-orange-500/80 dark:bg-orange-400/80 w-[90%] rounded-full"></div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>
			</div>
		</main>
	);
}
