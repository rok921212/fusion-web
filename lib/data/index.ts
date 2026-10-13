import "server-only";
import { ObjectId, type Document, type Filter } from "mongodb";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/lib/db";
import {
  C,
  plain,
  type Partner,
  type Post,
  type Service,
  type SiteLink,
  type SocialLink,
  type Video,
  type Work,
} from "@/lib/db/schema";
import { defaultSettings, type SiteSettings } from "@/lib/site";
import { OBJECT_ID } from "@/lib/validation";

// Every public read is cached and tagged. Admin mutations call updateTag with
// the same tags (see lib/admin/tables.ts), so edits show up immediately.
// Only published content is ever returned from here.
//
// The cached functions throw on database errors (errors are never cached), and
// the exported wrappers turn that into an empty result so one outage does not
// take the whole site down.

async function safe<T>(promise: Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    console.error(`Could not load ${label}`, error);
    return fallback;
  }
}

// Items created before a field existed are treated as published.
const isPublished = { published: { $ne: false } };

async function list<T>(
  collection: string,
  filter: Filter<Document>,
  sort: Record<string, 1 | -1>,
  limit = 200,
) {
  const db = await getDb();
  const docs = await db.collection(collection).find(filter).sort(sort).limit(limit).toArray();
  return docs.map((doc) => plain<T>(doc));
}

async function cachedSettings(): Promise<SiteSettings> {
  "use cache";
  cacheLife("hours");
  cacheTag("settings");

  const db = await getDb();
  const row = await db
    .collection<{ _id: string } & Partial<SiteSettings>>(C.settings)
    .findOne({ _id: "site" });
  const merged: SiteSettings = { ...defaultSettings };
  if (!row) return merged;
  for (const key of Object.keys(defaultSettings) as (keyof SiteSettings)[]) {
    const value = row[key];
    // Empty text falls back to the default; switches keep their stored value.
    if (typeof value === typeof defaultSettings[key] && value !== "") {
      (merged as Record<string, unknown>)[key] = value;
    }
  }
  return merged;
}

export function getSettings() {
  return safe(cachedSettings(), defaultSettings, "settings");
}

async function cachedWorkList() {
  "use cache";
  cacheLife("hours");
  cacheTag("work");
  return list<Work>(C.work, isPublished, { sortOrder: 1, date: -1, _id: -1 });
}

export function getWorkList() {
  return safe(cachedWorkList(), [] as Work[], "portfolio");
}

async function cachedWorkBySlug(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("work");
  cacheTag("partners");

  const db = await getDb();
  const doc = await db.collection(C.work).findOne({ slug, ...isPublished });
  if (!doc) return null;
  const item = plain<Work>(doc);

  // Same-category items first.
  const [related, partnerDoc] = await Promise.all([
    list<Work>(
      C.work,
      { ...isPublished, _id: { $ne: doc._id } },
      { sortOrder: 1, date: -1 },
      30,
    ),
    item.partnerId && OBJECT_ID.test(item.partnerId)
      ? db
          .collection(C.partners)
          .findOne({ _id: new ObjectId(item.partnerId), ...isPublished })
      : null,
  ]);
  related.sort(
    (a, b) => Number(b.category === item.category) - Number(a.category === item.category),
  );
  return {
    item,
    related: related.slice(0, 3),
    partner: partnerDoc ? plain<Partner>(partnerDoc) : null,
  };
}

export function getWorkBySlug(slug: string) {
  return safe(cachedWorkBySlug(slug), null, `portfolio item ${slug}`);
}

// Articles dated in the future stay hidden until that date (scheduled
// publishing). The hourly cache lifetime means they appear within an hour.
function livePosts(): Filter<Document> {
  return {
    ...isPublished,
    $or: [{ publishedAt: null }, { publishedAt: { $lte: new Date() } }],
  };
}

async function cachedPosts() {
  "use cache";
  cacheLife("hours");
  cacheTag("posts");
  return list<Post>(C.posts, livePosts(), { publishedAt: -1, _id: -1 });
}

export function getPosts() {
  return safe(cachedPosts(), [] as Post[], "news");
}

async function cachedPostBySlug(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("posts");

  const db = await getDb();
  const doc = await db.collection(C.posts).findOne({ slug, ...livePosts() });
  return doc ? plain<Post>(doc) : null;
}

export function getPostBySlug(slug: string) {
  return safe(cachedPostBySlug(slug), null, `article ${slug}`);
}

async function cachedServices() {
  "use cache";
  cacheLife("hours");
  cacheTag("services");
  return list<Service>(C.services, {}, { sortOrder: 1, _id: 1 });
}

export function getServices() {
  return safe(cachedServices(), [] as Service[], "services");
}

async function cachedPartners() {
  "use cache";
  cacheLife("hours");
  cacheTag("partners");
  return list<Partner>(C.partners, isPublished, { sortOrder: 1, _id: 1 });
}

export function getPartners() {
  return safe(cachedPartners(), [] as Partner[], "partners");
}

async function cachedVideos() {
  "use cache";
  cacheLife("hours");
  cacheTag("videos");
  return list<Video>(
    C.videos,
    {
      ...isPublished,
      $or: [{ publishedAt: null }, { publishedAt: { $lte: new Date() } }],
    },
    { sortOrder: 1, publishedAt: -1, _id: -1 },
  );
}

export function getVideos() {
  return safe(cachedVideos(), [] as Video[], "videos");
}

async function cachedLinks() {
  "use cache";
  // Short lifetime so links with a "hide after" date disappear on time.
  cacheLife("minutes");
  cacheTag("links");
  return list<SiteLink>(
    C.links,
    {
      ...isPublished,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    },
    { sortOrder: 1, _id: 1 },
  );
}

export async function getLinks(category?: string) {
  const links = await safe(cachedLinks(), [] as SiteLink[], "links");
  return category ? links.filter((link) => link.category === category) : links;
}

async function cachedSocials() {
  "use cache";
  cacheLife("hours");
  cacheTag("socials");
  return list<SocialLink>(C.socials, isPublished, { sortOrder: 1, _id: 1 });
}

export function getSocials() {
  return safe(cachedSocials(), [] as SocialLink[], "social links");
}
