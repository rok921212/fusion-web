import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Markdown } from "@/components/site/markdown";
import { Media } from "@/components/site/media";
import { Breadcrumbs, DetailFallback } from "@/components/site/section";
import { LiteYouTube } from "@/components/site/youtube";
import { getPostBySlug, getPosts } from "@/lib/data";
import { absoluteUrl, breadcrumbLd, buildMetadata, JsonLd } from "@/lib/seo";
import { formatDate } from "@/lib/utils";
import { coverFor, youtubeId } from "@/lib/youtube";

type Props = PageProps<"/news/[slug]">;

export async function generateStaticParams() {
  const posts = await getPosts();
  // Cache Components needs at least one param to validate the route.
  return posts.length
    ? posts.map((post) => ({ slug: post.slug }))
    : [{ slug: "__placeholder__" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Article not found", robots: { index: false } };
  return buildMetadata({
    title: post.seoTitle || post.title,
    description:
      post.seoDescription || post.excerpt || `${post.title}. News from Fusion Esports.`,
    path: `/news/${post.slug}`,
    image: coverFor(post) || undefined,
    type: "article",
    publishedTime: post.publishedAt,
  });
}

export default function PostPage({ params }: Props) {
  return (
    <Suspense fallback={<DetailFallback />}>
      <PostDetail params={params} />
    </Suspense>
  );
}

async function PostDetail({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();
  const video = post.youtube ? youtubeId(post.youtube) : null;

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "News", path: "/news" },
    { name: post.title, path: `/news/${post.slug}` },
  ];

  return (
    <article>
      <header className="border-b border-line bg-mist">
        <div className="container-page max-w-4xl py-12 sm:py-16">
          <Breadcrumbs items={crumbs} />
          {post.publishedAt && (
            <time
              dateTime={post.publishedAt.toISOString()}
              className="eyebrow mt-8"
            >
              {formatDate(post.publishedAt)}
            </time>
          )}
          <h1 className="heading-display mt-4 text-5xl sm:text-6xl">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="mt-5 text-lg leading-relaxed text-muted">
              {post.excerpt}
            </p>
          )}
        </div>
      </header>

      <div className="container-page max-w-4xl py-12 sm:py-16">
        {post.cover ? (
          <Media
            src={post.cover}
            alt={post.title}
            priority
            sizes="(min-width: 896px) 832px, 100vw"
            className="mb-12 aspect-[16/9] rounded-lg"
          />
        ) : (
          // Without an uploaded cover, the video itself is the cover.
          video && (
            <LiteYouTube
              id={video}
              title={post.title}
              sizes="(min-width: 896px) 832px, 100vw"
              className="mb-12 rounded-lg"
            />
          )
        )}
        <Markdown>{post.body}</Markdown>
        {video && post.cover && (
          <LiteYouTube
            id={video}
            title={post.title}
            sizes="(min-width: 896px) 832px, 100vw"
            className="mt-10 rounded-lg"
          />
        )}
        <Link
          href="/news"
          className="mt-14 inline-flex items-center gap-2 text-sm font-semibold hover:text-brand"
        >
          <ArrowLeft className="size-4" /> All news
        </Link>
      </div>

      <JsonLd data={breadcrumbLd(crumbs)} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: post.title,
          description: post.excerpt,
          url: absoluteUrl(`/news/${post.slug}`),
          mainEntityOfPage: absoluteUrl(`/news/${post.slug}`),
          ...(coverFor(post) && { image: [absoluteUrl(coverFor(post))] }),
          ...(post.publishedAt && {
            datePublished: post.publishedAt.toISOString(),
          }),
          dateModified: post.updatedAt.toISOString(),
          author: { "@id": absoluteUrl("/#organization") },
          publisher: { "@id": absoluteUrl("/#organization") },
        }}
      />
    </article>
  );
}
