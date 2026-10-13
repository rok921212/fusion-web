import { ArrowLeft, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { WorkCard } from "@/components/site/cards";
import { Markdown } from "@/components/site/markdown";
import { Media } from "@/components/site/media";
import { Breadcrumbs, DetailFallback } from "@/components/site/section";
import { LiteYouTube } from "@/components/site/youtube";
import { getWorkBySlug, getWorkList } from "@/lib/data";
import { absoluteUrl, breadcrumbLd, buildMetadata, JsonLd } from "@/lib/seo";
import { formatDate } from "@/lib/utils";
import { coverFor, youtubeId } from "@/lib/youtube";

type Props = PageProps<"/portfolio/[slug]">;

export async function generateStaticParams() {
  const items = await getWorkList();
  // Cache Components needs at least one param to validate the route.
  return items.length
    ? items.map((item) => ({ slug: item.slug }))
    : [{ slug: "__placeholder__" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getWorkBySlug(slug);
  if (!data) return { title: "Work not found", robots: { index: false } };
  const { item } = data;
  return buildMetadata({
    title: item.seoTitle || item.title,
    description:
      item.seoDescription ||
      item.summary ||
      `${item.title}, a project by Fusion Esports.`,
    path: `/portfolio/${item.slug}`,
    image: coverFor(item) || undefined,
  });
}

export default function WorkPage({ params }: Props) {
  return (
    <Suspense fallback={<DetailFallback />}>
      <WorkDetail params={params} />
    </Suspense>
  );
}

async function WorkDetail({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const data = await getWorkBySlug(slug);
  if (!data) notFound();
  const { item, related, partner } = data;
  const video = item.youtube ? youtubeId(item.youtube) : null;

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Portfolio", path: "/portfolio" },
    { name: item.title, path: `/portfolio/${item.slug}` },
  ];
  const facts = [
    { label: "Category", value: item.category },
    { label: "Client", value: item.client },
    { label: "Partner", value: partner?.name ?? "" },
    { label: "Date", value: formatDate(item.date) },
  ].filter((fact) => fact.value);

  return (
    <article>
      <header className="border-b border-line bg-mist">
        <div className="container-page py-12 sm:py-16">
          <Breadcrumbs items={crumbs} />
          {item.category && <p className="eyebrow mt-8">{item.category}</p>}
          <h1 className="heading-display mt-4 max-w-4xl text-5xl sm:text-7xl">
            {item.title}
          </h1>
          {item.summary && (
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
              {item.summary}
            </p>
          )}
        </div>
      </header>

      <div className="container-page py-12 sm:py-16">
        {/* Without an uploaded cover, the video itself is the cover. */}
        {!item.cover && video ? (
          <LiteYouTube
            id={video}
            title={item.title}
            sizes="(min-width: 1280px) 1216px, 100vw"
            className="rounded-lg"
          />
        ) : (
          <Media
            src={item.cover}
            alt={item.title}
            priority
            sizes="(min-width: 1280px) 1216px, 100vw"
            className="aspect-[16/9] rounded-lg"
          />
        )}

        <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_18rem]">
          <div>
            {item.body ? (
              <Markdown>{item.body}</Markdown>
            ) : (
              <p className="text-lg text-muted">{item.summary}</p>
            )}
          </div>
          {(facts.length > 0 || item.liveUrl) && (
            <aside className="space-y-4">
              <dl className="divide-y divide-line rounded-lg border border-line">
                {facts.map((fact) => (
                  <div key={fact.label} className="px-5 py-4">
                    <dt className="text-xs font-semibold uppercase tracking-widest text-muted">
                      {fact.label}
                    </dt>
                    <dd className="mt-1 font-medium">{fact.value}</dd>
                  </div>
                ))}
              </dl>
              {item.liveUrl && (
                <a
                  href={item.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg bg-ink px-5 py-4 font-semibold text-white transition-colors hover:bg-brand"
                >
                  Visit the project <ArrowUpRight className="size-5" />
                </a>
              )}
            </aside>
          )}
        </div>

        {video && item.cover && (
          <section className="mt-16">
            <h2 className="heading-display text-3xl">Watch</h2>
            <LiteYouTube
              id={video}
              title={item.title}
              sizes="(min-width: 1280px) 1216px, 100vw"
              className="mt-6 rounded-lg"
            />
          </section>
        )}

        {item.gallery.length > 0 && (
          <section className="mt-16">
            <h2 className="heading-display text-3xl">Gallery</h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {item.gallery.map((src, index) => (
                <li key={src}>
                  <Media
                    src={src}
                    alt={`${item.title}, image ${index + 1}`}
                    className="aspect-[4/3] rounded-lg"
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        <Link
          href="/portfolio"
          className="mt-14 inline-flex items-center gap-2 text-sm font-semibold hover:text-brand"
        >
          <ArrowLeft className="size-4" /> Back to portfolio
        </Link>
      </div>

      {related.length > 0 && (
        <section className="border-t border-line bg-mist py-16">
          <div className="container-page">
            <h2 className="heading-display text-4xl">More work</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((other) => (
                <WorkCard key={other.id} item={other} />
              ))}
            </div>
          </div>
        </section>
      )}

      <JsonLd data={breadcrumbLd(crumbs)} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: item.title,
          description: item.summary,
          url: absoluteUrl(`/portfolio/${item.slug}`),
          ...(coverFor(item) && { image: absoluteUrl(coverFor(item)) }),
          ...(item.date && { dateCreated: new Date(item.date).toISOString() }),
          ...(item.category && { genre: item.category }),
          creator: { "@id": absoluteUrl("/#organization") },
        }}
      />
    </article>
  );
}
