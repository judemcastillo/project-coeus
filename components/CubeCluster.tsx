"use client";

import {
	useRef,
	useState,
	type CSSProperties,
	type PointerEvent as ReactPointerEvent,
} from "react";

type Cube = {
	id: string;
	x: number;
	y: number;
	z: number;
	size: number;
	delay: number;
};

type DragState = {
	id: string;
	pointerId: number;
	startX: number;
	startY: number;
	originX: number;
	originY: number;
};

const cubes: Cube[] = [
	{ id: "c1", x: -2.2, y: 2.25, z: -1.2, size: 0.92, delay: -0.2 },
	{ id: "c2", x: -0.8, y: 2.7, z: -1.8, size: 0.94, delay: -0.7 },
	{ id: "c3", x: 0.75, y: 2.35, z: -1.25, size: 0.92, delay: -1.3 },
	{ id: "c4", x: 2.4, y: 2.15, z: -1.65, size: 0.92, delay: -2.1 },
	{ id: "c5", x: -1.55, y: 1.2, z: -0.6, size: 0.96, delay: -0.9 },
	{ id: "c6", x: -0.15, y: 1.1, z: -0.85, size: 0.98, delay: -1.8 },
	{ id: "c7", x: 1.2, y: 1.2, z: -0.35, size: 0.95, delay: -2.6 },
	{ id: "c8", x: 2.35, y: 1.15, z: -0.95, size: 0.9, delay: -3.1 },
	{ id: "c9", x: -2.1, y: 0.1, z: -0.15, size: 0.9, delay: -1.4 },
	{ id: "c10", x: -0.95, y: 0.15, z: 0.25, size: 1.02, delay: -2.2 },
	{ id: "c11", x: 0.35, y: 0.2, z: 0.75, size: 1.04, delay: -3.3 },
	{ id: "c12", x: 1.65, y: 0.2, z: 0.15, size: 0.98, delay: -0.5 },
	{ id: "c13", x: 2.75, y: 0.15, z: -0.55, size: 0.88, delay: -1.9 },
	{ id: "c14", x: -1.6, y: -0.95, z: 0.45, size: 0.92, delay: -2.9 },
	{ id: "c15", x: -0.35, y: -0.8, z: 0.95, size: 1.02, delay: -1.6 },
	{ id: "c16", x: 1.0, y: -0.95, z: 0.7, size: 0.98, delay: -2.4 },
	{ id: "c17", x: 2.25, y: -0.95, z: 0.05, size: 0.92, delay: -3.5 },
	{ id: "c18", x: -1.4, y: -2.0, z: 0.55, size: 0.9, delay: -0.8 },
	{ id: "c19", x: -0.1, y: -2.0, z: 0.2, size: 0.92, delay: -1.7 },
	{ id: "c20", x: 1.2, y: -2.15, z: -0.15, size: 0.9, delay: -2.7 },
	{ id: "c21", x: -2.95, y: -2.55, z: -1.05, size: 0.84, delay: -1.1 },
	{ id: "c22", x: 2.95, y: -2.75, z: -0.9, size: 0.84, delay: -2.1 },
	{ id: "c23", x: -2.55, y: -0.2, z: -1.55, size: 0.84, delay: -0.3 },
	{ id: "c24", x: 3.1, y: 0.95, z: -1.25, size: 0.84, delay: -2.8 },
	{ id: "c25", x: 0.15, y: 2.95, z: -0.95, size: 0.86, delay: -1.2 },
	{ id: "c26", x: -0.75, y: -2.95, z: -0.55, size: 0.86, delay: -1.9 },
];

const faceTransforms = [
	"translateZ(calc(var(--cube-size) / 2))",
	"rotateY(180deg) translateZ(calc(var(--cube-size) / 2))",
	"rotateY(90deg) translateZ(calc(var(--cube-size) / 2))",
	"rotateY(-90deg) translateZ(calc(var(--cube-size) / 2))",
	"rotateX(90deg) translateZ(calc(var(--cube-size) / 2))",
	"rotateX(-90deg) translateZ(calc(var(--cube-size) / 2))",
];

export function CubeCluster() {
	const wrapperRef = useRef<HTMLDivElement>(null);
	const [dragOffsets, setDragOffsets] = useState<Record<string, { x: number; y: number }>>(
		{},
	);
	const dragRef = useRef<DragState | null>(null);

	const updatePointerTilt = (event: ReactPointerEvent<HTMLDivElement>) => {
		const node = wrapperRef.current;
		if (!node) {
			return;
		}

		const bounds = node.getBoundingClientRect();
		const px = (event.clientX - bounds.left) / bounds.width - 0.5;
		const py = (event.clientY - bounds.top) / bounds.height - 0.5;

		node.style.setProperty("--pointer-rotate-x", `${7 - py * 16}deg`);
		node.style.setProperty("--pointer-rotate-y", `${px * 18}deg`);
		node.style.setProperty("--pointer-shift-x", `${px * 18}px`);
		node.style.setProperty("--pointer-shift-y", `${py * 14}px`);
	};

	const handleStagePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
		const activeDrag = dragRef.current;

		if (activeDrag && activeDrag.pointerId === event.pointerId) {
			const nextX = activeDrag.originX + (event.clientX - activeDrag.startX);
			const nextY = activeDrag.originY + (event.clientY - activeDrag.startY);

			setDragOffsets((current) => ({
				...current,
				[activeDrag.id]: {
					x: Math.max(-70, Math.min(70, nextX)),
					y: Math.max(-70, Math.min(70, nextY)),
				},
			}));
			return;
		}

		updatePointerTilt(event);
	};

	const handleStagePointerLeave = () => {
		if (dragRef.current) {
			return;
		}

		const node = wrapperRef.current;
		if (!node) {
			return;
		}

		node.style.setProperty("--pointer-rotate-x", "0deg");
		node.style.setProperty("--pointer-rotate-y", "0deg");
		node.style.setProperty("--pointer-shift-x", "0px");
		node.style.setProperty("--pointer-shift-y", "0px");
	};

	const handleCubePointerDown = (
		event: ReactPointerEvent<HTMLDivElement>,
		cubeId: string,
	) => {
		event.stopPropagation();

		const currentOffset = dragOffsets[cubeId] ?? { x: 0, y: 0 };
		dragRef.current = {
			id: cubeId,
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			originX: currentOffset.x,
			originY: currentOffset.y,
		};

		event.currentTarget.setPointerCapture(event.pointerId);
	};

	const releaseDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (dragRef.current?.pointerId !== event.pointerId) {
			return;
		}

		dragRef.current = null;
		updatePointerTilt(event);
	};

	return (
		<div
			ref={wrapperRef}
			onPointerMove={handleStagePointerMove}
			onPointerLeave={handleStagePointerLeave}
			className="cube-stage relative aspect-square w-full max-w-[580px] select-none touch-none"
		>
			<div className="cube-haze absolute inset-[14%] rounded-full" />
			<div className="cube-orbit absolute inset-0">
				<div className="cube-pointer absolute inset-0">
					<div className="cube-core absolute left-1/2 top-1/2">
						{cubes.map((cube) => {
							const dragOffset = dragOffsets[cube.id] ?? { x: 0, y: 0 };
							const style = {
								"--x": `${cube.x}`,
								"--y": `${cube.y}`,
								"--z": `${cube.z}`,
								"--cube-size": `calc(var(--unit) * ${cube.size})`,
								"--drag-x": `${dragOffset.x}px`,
								"--drag-y": `${dragOffset.y}px`,
								animationDelay: `${cube.delay}s`,
							} as CSSProperties;

							return (
								<div
									key={cube.id}
									className="cube"
									style={style}
									onPointerDown={(event) => handleCubePointerDown(event, cube.id)}
									onPointerUp={releaseDrag}
									onPointerCancel={releaseDrag}
								>
									{faceTransforms.map((transform, index) => (
										<span
											key={`${cube.id}-${transform}`}
											className="cube-face"
											data-face={index}
											style={{ transform }}
										/>
									))}
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}
