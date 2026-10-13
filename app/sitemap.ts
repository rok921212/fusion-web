import type { MetadataRoute } from "next";
import { getPosts, getWorkList } from "@/lib/data";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [work, posts] = await Promise.all([getWorkList(), getPosts()]);

  const staticPages = [
    { path: "", priority: 1 },
    { path: "/portfolio", priority: 0.9 },
    { path: "/services", priority: 0.8 },
    { path: "/videos", priority: 0.8 },
    { path: "/news", priority: 0.8 },
    { path: "/partners", priority: 0.7 },
    { path: "/about", priority: 0.7 },
    { path: "/contact", priority: 0.6 },
  ].map(({ path, priority }) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: "weekly" as const,
    priority,
  }));

  return [
    ...staticPages,
    ...work.map((item) => ({
      url: `${siteUrl}/portfolio/${item.slug}`,
      lastModified: item.updatedAt,
      priority: 0.7,
    })),
    ...posts.map((post) => ({
      url: `${siteUrl}/news/${post.slug}`,
      lastModified: post.updatedAt,
      priority: 0.6,
    })),
  ];
}
