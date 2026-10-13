"use client";

import { useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Tilts its child in 3D towards the pointer, with a soft glare. Only on
 * devices with a fine pointer, and never with reduced motion. Updates go
 * through CSS variables in a requestAnimationFrame, so React does not
 * re-render while the pointer moves.
 */
export function Tilt({
  children,
  className,
  max = 8,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const reduce = useReducedMotion();

  function update(x: number, y: number, active: boolean) {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const node = ref.current;
      if (!node) return;
      node.style.setProperty("--rx", `${active ? (0.5 - y) * max * 2 : 0}deg`);
      node.style.setProperty("--ry", `${active ? (x - 0.5) * max * 2 : 0}deg`);
      node.style.setProperty("--gx", `${x * 100}%`);
      node.style.setProperty("--gy", `${y * 100}%`);
      node.style.setProperty("--glare", active ? "1" : "0");
    });
  }

  return (
    <div
      ref={ref}
      onPointerMove={(event) => {
        if (reduce || event.pointerType !== "mouse") return;
        const rect = event.currentTarget.getBoundingClientRect();
        update(
          (event.clientX - rect.left) / rect.width,
          (event.clientY - rect.top) / rect.height,
          true,
        );
      }}
      onPointerLeave={() => update(0.5, 0.5, false)}
      className={cn("group/tilt h-full [perspective:900px]", className)}
    >
      <div className="relative h-full transition-transform duration-200 ease-out [transform-style:preserve-3d] [transform:rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] motion-reduce:transform-none">
        {children}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-lg opacity-[var(--glare,0)] transition-opacity duration-300"
          style={{
            background:
              "radial-gradient(circle at var(--gx,50%) var(--gy,50%), rgba(255,255,255,0.35), transparent 55%)",
            mixBlendMode: "soft-light",
          }}
        />
      </div>
    </div>
  );
}
