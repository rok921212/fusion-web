import { cn } from "@/lib/utils";

// Decorative animated SVGs. Motion is defined in globals.css and switched off
// for visitors who prefer reduced motion.

/** Grid with red signal lines travelling along circuit-style paths. */
export function CircuitArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 500"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <pattern id="circuit-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="400" height="500" fill="url(#circuit-grid)" />
      <g stroke="#d90429" strokeWidth="2" strokeLinecap="round">
        <path className="svg-flow" d="M0 120h80l40 40h120l40-40h120" />
        <path className="svg-flow svg-flow-slow" d="M0 380h120l40-40h80l40 40h120" />
        <path className="svg-flow svg-flow-reverse" d="M200 0v80l-40 40v120" />
      </g>
      <g fill="#d90429">
        <circle className="svg-pulse" cx="120" cy="160" r="4" />
        <circle className="svg-pulse" cx="280" cy="380" r="4" style={{ animationDelay: "0.8s" }} />
        <circle className="svg-pulse" cx="160" cy="240" r="4" style={{ animationDelay: "1.6s" }} />
      </g>
    </svg>
  );
}

/** Concentric rotating rings used behind page headers. */
export function OrbitArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      fill="none"
      aria-hidden="true"
      className={cn("text-brand", className)}
    >
      <g className="svg-spin" style={{ transformOrigin: "200px 200px" }}>
        <circle cx="200" cy="200" r="190" stroke="currentColor" strokeOpacity="0.25" strokeDasharray="4 12" />
        <circle cx="390" cy="200" r="6" fill="currentColor" />
      </g>
      <g
        className="svg-spin svg-spin-reverse"
        style={{ transformOrigin: "200px 200px" }}
      >
        <circle cx="200" cy="200" r="130" stroke="currentColor" strokeOpacity="0.4" />
        <circle cx="200" cy="70" r="5" fill="currentColor" />
      </g>
      <path
        d="M200 130l60.6 35v70L200 270l-60.6-35v-70z"
        stroke="currentColor"
        strokeWidth="2"
        className="svg-draw"
      />
      <path d="M200 160l34.6 20v40L200 240l-34.6-20v-40z" fill="currentColor" fillOpacity="0.12" />
    </svg>
  );
}
