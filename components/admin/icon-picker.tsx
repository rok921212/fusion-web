"use client";

import { Check, Loader2, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { IconGlyph, type IconData } from "@/components/site/icon-glyph";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { cn } from "@/lib/utils";

type Option = { key: string; title: string; icon: IconData };

type ApiIcon =
  | { kind: "brand"; key: string; title: string; path: string }
  | { kind: "generic"; key: string; title: string; name: string };

const toOption = (icon: ApiIcon): Option => ({
  key: icon.key,
  title: icon.title,
  icon:
    icon.kind === "brand"
      ? { kind: "brand", path: icon.path }
      : { kind: "generic", name: icon.name },
});

/**
 * Searchable picker over ~3,000 open-source brand icons (simple-icons) plus a
 * few generic ones. Stores the icon key in a hidden input.
 */
export function IconPicker({ name, initial }: { name: string; initial: Option | null }) {
  const [selected, setSelected] = useState<Option | null>(initial);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/admin/icons?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error();
        const data = (await response.json()) as { icons: ApiIcon[] };
        setResults(data.icons.map(toOption));
      } catch {
        if (!controller.signal.aborted) setError("Icons could not be loaded.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={selected?.key ?? ""} />
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex size-12 items-center justify-center rounded-md border border-line bg-ink text-white">
          <IconGlyph icon={selected?.icon ?? null} className="size-6" />
        </span>
        <span className="text-sm">
          {selected ? (
            <span className="font-medium">{selected.title}</span>
          ) : (
            <span className="text-muted">Detected from the link</span>
          )}
        </span>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? "Close" : "Choose icon"}
        </Button>
        {selected && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(null)}>
            <X /> Clear
          </Button>
        )}
      </div>

      {open && (
        <div className="rounded-lg border border-line bg-mist p-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search 3,000+ brands: discord, whatsapp, steam…"
              aria-label="Search icons"
              className="pl-9"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted" />
            )}
          </div>
          {error && <p className="mt-2 text-sm text-brand">{error}</p>}
          <ul className="mt-3 grid max-h-72 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5 lg:grid-cols-6">
            {results.map((option) => {
              const active = option.key === selected?.key;
              return (
                <li key={option.key}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(option);
                      setOpen(false);
                    }}
                    aria-pressed={active}
                    title={option.title}
                    className={cn(
                      "relative flex w-full flex-col items-center gap-1.5 rounded-md border bg-white px-2 py-3 text-center text-[11px] leading-tight transition-colors hover:border-brand",
                      active ? "border-brand" : "border-line",
                    )}
                  >
                    <IconGlyph icon={option.icon} className="size-6" />
                    <span className="line-clamp-1 w-full">{option.title}</span>
                    {active && <Check className="absolute right-1 top-1 size-3.5 text-brand" />}
                  </button>
                </li>
              );
            })}
          </ul>
          {!loading && !results.length && !error && (
            <p className="py-6 text-center text-sm text-muted">No icons match “{query}”.</p>
          )}
          <p className="mt-3 text-xs text-muted">
            Brand icons from simple-icons (CC0). Brand names and logos belong to their owners.
          </p>
        </div>
      )}
    </div>
  );
}
