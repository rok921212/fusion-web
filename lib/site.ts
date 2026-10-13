export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

export const navLinks = [
  { href: "/portfolio", label: "Portfolio" },
  { href: "/services", label: "Services" },
  { href: "/videos", label: "Videos" },
  { href: "/news", label: "News" },
  { href: "/partners", label: "Partners" },
  { href: "/about", label: "About" },
] as const;

// Used until the settings row exists in the database, and as the fallback
// for any field the admin leaves empty.
export const defaultSettings = {
  siteName: "Fusion Esports",
  tagline: "Broadcast & production solutions",
  description:
    "Fusion Esports is a professional esports organization: competitive teams, tournament production, content and brand partnerships.",
  about:
    "Fusion Esports brings players, creators and brands together under one professionally managed organization.\n\nEdit this text from the admin portal under **Settings**.",
  stats: "",
  email: "",
  phone: "",
  address: "",
  whatsapp: "",
  ogImage: "",
  // Home page editor
  heroPrefix: "FUSION",
  heroWords: "ESPORTS\nPRODUCTION\nBROADCAST\nAPPAREL",
  heroPrimaryLabel: "View our work",
  heroPrimaryHref: "/portfolio",
  heroSecondaryLabel: "Work with us",
  heroSecondaryHref: "/contact",
  announcement: "",
  announcementHref: "",
  showLive: true,
  showServices: true,
  showVideos: true,
  showPortfolio: true,
  showNews: true,
  showPartners: true,
};

export type SiteSettings = typeof defaultSettings;

export type SectionKey = {
  [K in keyof SiteSettings]: SiteSettings[K] extends boolean ? K : never;
}[keyof SiteSettings];

// Shown until services are added from the admin portal.
export const defaultServices = [
  {
    title: "Competitive teams",
    description:
      "Professionally managed rosters with coaching, scheduling and performance support.",
    icon: "trophy",
  },
  {
    title: "Tournament production",
    description:
      "Event planning, operations and broadcast for online and in-person competitions.",
    icon: "calendar",
  },
  {
    title: "Content and media",
    description:
      "Video, streaming and social content that builds an audience around the brand.",
    icon: "video",
  },
  {
    title: "Brand partnerships",
    description:
      "Sponsorship and activation programs that connect partners with the gaming community.",
    icon: "handshake",
  },
  {
    title: "Creative and design",
    description:
      "Identity, jerseys, overlays and event design with a consistent visual standard.",
    icon: "palette",
  },
  {
    title: "Community",
    description:
      "Programs and events that bring players and fans together year-round.",
    icon: "users",
  },
];

/** The rotating headline words: one per line, up to eight. */
export function parseHeroWords(text: string) {
  return text
    .split(/\r?\n/)
    .map((word) => word.trim())
    .filter(Boolean)
    .slice(0, 8);
}

/** Parses the settings "stats" text: one "value | label" pair per line. */
export function parseStats(stats: string) {
  return stats
    .split("\n")
    .map((line) => line.split("|").map((part) => part.trim()))
    .filter((parts) => parts.length === 2 && parts[0] && parts[1])
    .slice(0, 4)
    .map(([value, label]) => ({ value, label }));
}

export const keywords = [
  "Fusion Esports",
  "Fusion Esports team",
  "esports organization",
  "competitive gaming",
  "esports tournaments",
  "esports portfolio",
];
