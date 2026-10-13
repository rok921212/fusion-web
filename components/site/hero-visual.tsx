"use client";

import dynamic from "next/dynamic";
import { CircuitArt } from "./svg-art";

// three.js is only downloaded in the browser, after the page is interactive,
// so it never delays the text content.
const HeroScene = dynamic(() => import("./hero-scene"), { ssr: false });

export function HeroVisual() {
  return (
    <div
      aria-hidden="true"
      className="relative aspect-square overflow-hidden rounded-lg bg-ink lg:aspect-[4/5]"
    >
      <CircuitArt className="absolute inset-0 size-full text-white/15" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(217,4,41,0.35),transparent_60%)]" />
      <HeroScene />
    </div>
  );
}
