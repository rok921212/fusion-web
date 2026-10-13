"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Counts up to the number inside `value` ("120+", "$2.5M") when scrolled into
 * view. The final value is what the server renders, so it is correct without
 * JavaScript.
 */
export function NumberTicker({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    const match = value.match(/^(\D*)(\d[\d,]*)(\.\d+)?(.*)$/);
    if (!node || !match || !inView || reduce) return;

    const [, prefix, whole, fraction = "", suffix] = match;
    const target = Number(whole.replace(/,/g, "") + fraction);
    const decimals = Math.max(fraction.length - 1, 0);
    const controls = animate(0, target, {
      duration: 1.4,
      ease: "easeOut",
      onUpdate: (latest) => {
        node.textContent =
          prefix +
          latest.toLocaleString("en-US", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          }) +
          suffix;
      },
      onComplete: () => {
        node.textContent = value;
      },
    });
    return () => controls.stop();
  }, [inView, reduce, value]);

  return (
    <span ref={ref} className="tabular-nums">
      {value}
    </span>
  );
}

/** Card wrapper with a red glow that follows the pointer. */
export function Spotlight({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--x", `${event.clientX - rect.left}px`);
        event.currentTarget.style.setProperty("--y", `${event.clientY - rect.top}px`);
      }}
      className={cn("group/spot relative h-full", className)}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px rounded-lg opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{
          background:
            "radial-gradient(220px circle at var(--x) var(--y), rgba(217,4,41,0.35), transparent 70%)",
        }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
}

/** Endless horizontal scroller; pauses on hover. */
export function Marquee({ children }: { children: ReactNode }) {
  return (
    <div className="marquee overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div className="marquee-track flex w-max">
        <ul className="flex shrink-0 items-center gap-14 pr-14">{children}</ul>
        <ul aria-hidden="true" inert className="flex shrink-0 items-center gap-14 pr-14">
          {children}
        </ul>
      </div>
    </div>
  );
}
