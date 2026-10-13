import type { Metadata } from "next";
import { defaultSettings, siteUrl, type SiteSettings } from "@/lib/site";

type PageSeo = {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article";
  publishedTime?: Date | null;
};

export function absoluteUrl(path: string) {
  return path.startsWith("http") ? path : `${siteUrl}${path}`;
}

export function buildMetadata({
  title,
  description,
  path,
  image,
  type = "website",
  publishedTime,
}: PageSeo): Metadata {
  // A page-level openGraph object replaces the root one entirely, so the
  // site name and the generated fallback image are repeated here.
  const images = [
    image
      ? { url: absoluteUrl(image) }
      : { url: "/opengraph-image", width: 1200, height: 630, alt: defaultSettings.siteName },
  ];
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type,
      siteName: defaultSettings.siteName,
      locale: "en_US",
      images,
      ...(type === "article" &&
        publishedTime && { publishedTime: publishedTime.toISOString() }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.map((i) => i.url),
    },
  };
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export function organizationLd(settings: SiteSettings, profiles: string[] = []) {
  const sameAs = profiles.filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    "@id": `${siteUrl}/#organization`,
    name: settings.siteName,
    url: siteUrl,
    description: settings.description,
    sport: "Esports",
    logo: `${siteUrl}/brand/fusion-logo-square.png`,
    ...(sameAs.length && { sameAs }),
    ...(settings.email && { email: settings.email }),
    ...(settings.phone && { telephone: settings.phone }),
    ...(settings.address && { address: settings.address }),
  };
}

export function websiteLd(settings: SiteSettings) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: settings.siteName,
    url: siteUrl,
    publisher: { "@id": `${siteUrl}/#organization` },
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
