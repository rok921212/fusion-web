"use client";

import { useState } from "react";
import type { Work } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { WorkCard } from "./cards";
import { Tilt } from "./tilt";

// Every item is rendered into the HTML; the filter only hides cards, so
// search engines always see the whole portfolio.
export function PortfolioGrid({ items }: { items: Work[] }) {
  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))];
  const [active, setActive] = useState<string | null>(null);

  return (
    <>
      {categories.length > 1 && (
        <div
          role="group"
          aria-label="Filter by category"
          className="mb-10 flex flex-wrap gap-2"
        >
          {[null, ...categories].map((category) => (
            <button
              key={category ?? "all"}
              type="button"
              aria-pressed={active === category}
              onClick={() => setActive(category)}
              className={cn(
                "h-10 rounded-full border px-5 text-sm font-medium transition-colors",
                active === category
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-white text-ink-soft hover:border-ink",
              )}
            >
              {category ?? "All work"}
            </button>
          ))}
        </div>
      )}
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <li
            key={item.id}
            hidden={active !== null && item.category !== active}
          >
            <Tilt>
              <WorkCard item={item} priority={index < 3} />
            </Tilt>
          </li>
        ))}
      </ul>
    </>
  );
}
