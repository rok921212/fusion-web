// Plain data describing every content type the admin portal can manage.
// Safe to import from client components; the matching collections live in
// lib/admin/tables.ts.

export type FieldType =
  | "text"
  | "textarea"
  | "markdown"
  | "slug"
  | "image"
  | "gallery"
  | "checkbox"
  | "number"
  | "date"
  | "url"
  | "youtube"
  | "select"
  | "partner"
  | "icon"
  | "brandicon";

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  /** For slug fields: the field the slug is generated from when left empty. */
  slugFrom?: string;
  defaultValue?: boolean | number | string;
  /** For select fields. */
  options?: readonly { value: string; label: string }[];
  /** Overrides the default length limit for text fields. */
  max?: number;
};

export type Resource = {
  label: string;
  singular: string;
  titleField: string;
  /** Extra columns shown in the list view. */
  columns: string[];
  fields: Field[];
  /** Public URL prefix for items that have their own page. */
  publicPath?: string;
  /** Public page listing these items, revalidated after every change. */
  listPath?: string;
};

const sortOrder: Field = {
  name: "sortOrder",
  label: "Display order",
  type: "number",
  help: "Lower numbers appear first.",
};

const published: Field = {
  name: "published",
  label: "Published (visible on the website)",
  type: "checkbox",
  defaultValue: true,
  help: "Content editors save drafts; an admin publishes them.",
};

const featured = (label: string): Field => ({
  name: "featured",
  label,
  type: "checkbox",
});

const seo: Field[] = [
  {
    name: "seoTitle",
    label: "SEO title",
    type: "text",
    max: 70,
    help: "Optional. Replaces the title in Google results and social previews.",
  },
  {
    name: "seoDescription",
    label: "SEO description",
    type: "textarea",
    max: 170,
    help: "Optional. 150 to 160 characters works best.",
  },
];

export const videoCategories = [
  { value: "highlights", label: "Highlights" },
  { value: "tournaments", label: "Tournaments" },
  { value: "behind-the-scenes", label: "Behind the scenes" },
  { value: "updates", label: "Tutorials & updates" },
] as const;

export const linkCategories = [
  { value: "live", label: "Live now (home page)" },
  { value: "resource", label: "Resources (footer)" },
  { value: "partner", label: "Partner pages" },
] as const;

export const partnerCategories = [
  { value: "sponsor", label: "Sponsor" },
  { value: "partner", label: "Partner" },
  { value: "collaborator", label: "Collaborator" },
  { value: "media", label: "Media partner" },
] as const;

export const resources = {
  portfolio: {
    label: "Portfolio",
    singular: "project",
    titleField: "title",
    columns: ["category", "featured", "published"],
    publicPath: "/portfolio",
    listPath: "/portfolio",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "URL slug", type: "slug", slugFrom: "title" },
      {
        name: "category",
        label: "Category",
        type: "text",
        help: "For example: Tournament, Broadcast, Content.",
      },
      {
        name: "summary",
        label: "Summary",
        type: "textarea",
        help: "One or two sentences. Shown on cards and used as the search description.",
      },
      { name: "client", label: "Client / organization", type: "text" },
      {
        name: "partnerId",
        label: "Partner",
        type: "partner",
        help: "Links this project to a partner's collaborations.",
      },
      { name: "date", label: "Project date", type: "date" },
      { name: "cover", label: "Cover image", type: "image" },
      { name: "gallery", label: "Gallery", type: "gallery" },
      {
        name: "youtube",
        label: "YouTube video",
        type: "youtube",
        help: "Optional. Shown on the project page.",
      },
      { name: "liveUrl", label: "Project link", type: "url", help: "Event page, stream or website." },
      { name: "body", label: "Details", type: "markdown" },
      featured("Feature on the home page"),
      published,
      sortOrder,
      ...seo,
    ],
  },
  news: {
    label: "News",
    singular: "article",
    titleField: "title",
    columns: ["publishedAt", "featured", "published"],
    publicPath: "/news",
    listPath: "/news",
    fields: [
      { name: "title", label: "Headline", type: "text", required: true },
      { name: "slug", label: "URL slug", type: "slug", slugFrom: "title" },
      {
        name: "excerpt",
        label: "Summary",
        type: "textarea",
        help: "Shown on cards and used as the search description.",
      },
      { name: "cover", label: "Cover image", type: "image" },
      { name: "body", label: "Article", type: "markdown" },
      {
        name: "youtube",
        label: "YouTube video",
        type: "youtube",
        help: "Optional. Embedded under the article.",
      },
      {
        name: "publishedAt",
        label: "Publish date",
        type: "date",
        help: "A future date schedules the article: it stays hidden until that day.",
      },
      featured("Featured article"),
      published,
      ...seo,
    ],
  },
  videos: {
    label: "YouTube & Videos",
    singular: "video",
    titleField: "title",
    columns: ["category", "featured", "published"],
    listPath: "/videos",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      {
        name: "youtube",
        label: "YouTube link",
        type: "youtube",
        required: true,
        help: "Paste any YouTube link: watch, youtu.be, Shorts or embed.",
      },
      { name: "description", label: "Description", type: "textarea" },
      {
        name: "category",
        label: "Section",
        type: "select",
        options: videoCategories,
        defaultValue: "highlights",
      },
      { name: "publishedAt", label: "Publish date", type: "date" },
      featured("Feature on the home page"),
      published,
      sortOrder,
    ],
  },
  partners: {
    label: "Partners",
    singular: "partner",
    titleField: "name",
    columns: ["category", "featured", "published"],
    listPath: "/partners",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "logo", label: "Logo", type: "image" },
      { name: "url", label: "Website", type: "url" },
      {
        name: "category",
        label: "Partnership type",
        type: "select",
        options: partnerCategories,
        defaultValue: "partner",
      },
      { name: "description", label: "About the partnership", type: "textarea" },
      featured("Featured partner"),
      published,
      sortOrder,
    ],
  },
  links: {
    label: "Website Links",
    singular: "link",
    titleField: "title",
    columns: ["category", "published"],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "url", label: "Link", type: "url", required: true },
      { name: "description", label: "Description", type: "textarea" },
      {
        name: "category",
        label: "Where it appears",
        type: "select",
        options: linkCategories,
        defaultValue: "live",
      },
      {
        name: "expiresAt",
        label: "Hide after",
        type: "date",
        help: "Optional. Useful for live streams and limited-time events.",
      },
      featured("Highlight this link"),
      published,
      sortOrder,
    ],
  },
  socials: {
    label: "Social Links",
    singular: "social link",
    titleField: "name",
    columns: ["url", "published"],
    listPath: "/contact",
    fields: [
      {
        name: "name",
        label: "Name",
        type: "text",
        required: true,
        max: 60,
        help: "Shown to screen readers and on hover, e.g. Discord or Official WhatsApp.",
      },
      {
        name: "url",
        label: "Link",
        type: "url",
        required: true,
        help: "Full address, e.g. https://discord.gg/… · https://wa.me/97798… · https://t.me/…",
      },
      {
        name: "icon",
        label: "Icon",
        type: "brandicon",
        help: "Pick from 3,000+ open-source brand icons. Leave empty to detect it from the link.",
      },
      {
        name: "iconImage",
        label: "Or upload your own icon",
        type: "image",
        help: "Optional PNG, square, at least 64 × 64 px with a transparent background. Replaces the icon above.",
      },
      published,
      sortOrder,
    ],
  },
  services: {
    label: "Services",
    singular: "service",
    titleField: "title",
    columns: ["icon"],
    listPath: "/services",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "icon", label: "Icon", type: "icon" },
      sortOrder,
    ],
  },
} satisfies Record<string, Resource>;

export type ResourceKey = keyof typeof resources;

export function getResource(key: string): Resource | null {
  return Object.hasOwn(resources, key) ? resources[key as ResourceKey] : null;
}

export const iconNames = [
  "trophy",
  "users",
  "video",
  "megaphone",
  "calendar",
  "handshake",
  "gamepad",
  "chart",
  "palette",
  "shield",
] as const;
