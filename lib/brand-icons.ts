import "server-only";
import * as simpleIcons from "simple-icons";
import type { SimpleIcon } from "simple-icons";

// Icons for social links. Brand icons come from simple-icons (CC0, about
// 3,000 brands) and are only ever loaded on the server; the admin picker
// searches them through /api/admin/icons. A few generic icons cover
// non-brand links. Stored keys look like "si:discord" or "generic:globe".

export const genericIcons = {
  globe: "Website",
  mail: "Email",
  phone: "Phone",
  message: "Chat",
  link: "Link",
  map: "Location",
} as const;

export type GenericIcon = keyof typeof genericIcons;

export type ResolvedIcon =
  | { kind: "brand"; key: string; title: string; path: string; hex: string }
  | { kind: "generic"; key: string; title: string; name: GenericIcon };

const brands = new Map<string, SimpleIcon>();
for (const value of Object.values(simpleIcons)) {
  if (value && typeof value === "object" && "slug" in value && "path" in value) {
    const icon = value as SimpleIcon;
    brands.set(icon.slug, icon);
  }
}

function brand(icon: SimpleIcon): ResolvedIcon {
  return { kind: "brand", key: `si:${icon.slug}`, title: icon.title, path: icon.path, hex: icon.hex };
}

export function resolveIcon(key: string): ResolvedIcon | null {
  if (key.startsWith("si:")) {
    const icon = brands.get(key.slice(3));
    return icon ? brand(icon) : null;
  }
  if (key.startsWith("generic:")) {
    const name = key.slice(8);
    return Object.hasOwn(genericIcons, name)
      ? { kind: "generic", key, title: genericIcons[name as GenericIcon], name: name as GenericIcon }
      : null;
  }
  return null;
}

export function isIconKey(key: string) {
  return resolveIcon(key) !== null;
}

/** Brand icons whose name matches the query, best matches first. */
export function searchIcons(query: string, limit = 48): ResolvedIcon[] {
  const q = query.trim().toLowerCase().slice(0, 40);
  const generic = Object.entries(genericIcons)
    .filter(([name, title]) => !q || name.includes(q) || title.toLowerCase().includes(q))
    .map(([name]) => resolveIcon(`generic:${name}`)!);
  if (!q) {
    const popular = [
      "discord", "instagram", "facebook", "x", "youtube", "twitch", "tiktok", "whatsapp",
      "telegram", "kick", "threads", "reddit", "snapchat", "steam", "spotify", "github",
    ];
    return [...generic, ...popular.flatMap((slug) => (brands.has(slug) ? [brand(brands.get(slug)!)] : []))];
  }
  const scored: [number, SimpleIcon][] = [];
  for (const icon of brands.values()) {
    const title = icon.title.toLowerCase();
    const score =
      icon.slug === q || title === q ? 0 : title.startsWith(q) || icon.slug.startsWith(q) ? 1 : title.includes(q) ? 2 : -1;
    if (score >= 0) scored.push([score, icon]);
  }
  scored.sort((a, b) => a[0] - b[0] || a[1].title.localeCompare(b[1].title));
  return [...generic, ...scored.slice(0, limit).map(([, icon]) => brand(icon))];
}

const hosts: [RegExp, string][] = [
  [/(^|\.)(discord\.gg|discord\.com)$/, "discord"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)(facebook\.com|fb\.me|fb\.com)$/, "facebook"],
  [/(^|\.)(x\.com|twitter\.com)$/, "x"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
  [/(^|\.)twitch\.tv$/, "twitch"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)kick\.com$/, "kick"],
  [/(^|\.)threads\.(net|com)$/, "threads"],
  [/(^|\.)(t\.me|telegram\.me|telegram\.org)$/, "telegram"],
  [/(^|\.)(wa\.me|whatsapp\.com)$/, "whatsapp"],
  [/(^|\.)reddit\.com$/, "reddit"],
  [/(^|\.)snapchat\.com$/, "snapchat"],
  [/(^|\.)steamcommunity\.com$/, "steam"],
  [/(^|\.)spotify\.com$/, "spotify"],
  [/(^|\.)github\.com$/, "github"],
];

/** Guesses the brand icon from a link's address, for links without one. */
export function iconForUrl(url: string): ResolvedIcon | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const slug = hosts.find(([pattern]) => pattern.test(host))?.[1];
    return slug ? resolveIcon(`si:${slug}`) : null;
  } catch {
    return null;
  }
}
