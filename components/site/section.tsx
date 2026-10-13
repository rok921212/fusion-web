import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { OrbitArt } from "./svg-art";

export function Section({
  eyebrow,
  title,
  intro,
  link,
  tone = "white",
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  link?: { href: string; label: string };
  tone?: "white" | "mist";
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "py-16 sm:py-24",
        tone === "mist" && "border-y border-line bg-mist",
        className,
      )}
    >
      <div className="container-page">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6 sm:mb-14">
          <div className="max-w-2xl">
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2 className="heading-display mt-3 text-4xl sm:text-5xl">
              {title}
            </h2>
            {intro && (
              <p className="mt-4 text-lg leading-relaxed text-muted">{intro}</p>
            )}
          </div>
          {link && (
            <Link
              href={link.href}
              className="group inline-flex items-center gap-2 text-sm font-semibold text-ink hover:text-brand"
            >
              {link.label}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

export function PageHero({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  children?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden border-b border-line bg-mist">
      <OrbitArt className="absolute -right-20 top-1/2 hidden size-[26rem] -translate-y-1/2 opacity-70 md:block" />
      <div className="container-page relative py-14 sm:py-20">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="heading-display mt-4 max-w-4xl text-5xl sm:text-7xl">
          {title}
        </h1>
        {intro && (
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            {intro}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

/** Suspense fallback for detail pages; mirrors their header block. */
export function DetailFallback() {
  return (
    <div className="border-b border-line bg-mist" aria-busy="true">
      <div className="container-page animate-pulse py-12 sm:py-16">
        <div className="h-4 w-48 rounded bg-line" />
        <div className="mt-10 h-14 w-2/3 rounded bg-line" />
        <div className="mt-5 h-5 w-1/2 rounded bg-line" />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-line bg-mist px-6 py-14 text-center text-muted">
      {children}
    </p>
  );
}

export function Breadcrumbs({
  items,
}: {
  items: { name: string; path: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <li key={item.path} className="flex items-center gap-2">
            {index > 0 && <span aria-hidden="true">/</span>}
            {index === items.length - 1 ? (
              <span aria-current="page" className="text-ink">
                {item.name}
              </span>
            ) : (
              <Link href={item.path} className="hover:text-brand">
                {item.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
