import type { ReactNode } from "react";
import { Logo } from "@/components/site/logo";

// Centered card used by the sign-in, sign-up and invitation pages.
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-ink px-4 py-16">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(217,4,41,0.35),transparent_45%),radial-gradient(circle_at_80%_90%,rgba(217,4,41,0.2),transparent_40%)]"
      />
      <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-white p-8 shadow-2xl sm:p-10">
        <Logo name="Fusion Esports" label="Admin" />
        {children}
      </div>
    </main>
  );
}
