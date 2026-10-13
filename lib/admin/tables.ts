import "server-only";
import type { Sort } from "mongodb";
import { C } from "@/lib/db/schema";
import type { ResourceKey } from "./resources";

// The MongoDB collection behind each admin resource, its admin list order,
// and the cache tag public pages use for it.
export const tables: Record<
  ResourceKey,
  { collection: string; sort: Sort; tag: string; searchField: string }
> = {
  portfolio: {
    collection: C.work,
    sort: { sortOrder: 1, date: -1, _id: -1 },
    tag: "work",
    searchField: "title",
  },
  news: {
    collection: C.posts,
    sort: { publishedAt: -1, _id: -1 },
    tag: "posts",
    searchField: "title",
  },
  videos: {
    collection: C.videos,
    sort: { sortOrder: 1, publishedAt: -1, _id: -1 },
    tag: "videos",
    searchField: "title",
  },
  partners: {
    collection: C.partners,
    sort: { sortOrder: 1, _id: 1 },
    tag: "partners",
    searchField: "name",
  },
  links: {
    collection: C.links,
    sort: { category: 1, sortOrder: 1, _id: 1 },
    tag: "links",
    searchField: "title",
  },
  socials: {
    collection: C.socials,
    sort: { sortOrder: 1, _id: 1 },
    tag: "socials",
    searchField: "name",
  },
  services: {
    collection: C.services,
    sort: { sortOrder: 1, _id: 1 },
    tag: "services",
    searchField: "title",
  },
};

export type Row = Record<string, unknown> & { id: string };
