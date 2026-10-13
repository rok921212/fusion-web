import { NewsCard } from "@/components/site/cards";
import { Reveal } from "@/components/site/reveal";
import { EmptyState, PageHero } from "@/components/site/section";
import { getPosts } from "@/lib/data";
import { buildMetadata, breadcrumbLd, JsonLd } from "@/lib/seo";

const description =
  "News, results and announcements from Fusion Esports: roster moves, tournament recaps and partner updates.";

export const metadata = buildMetadata({
  title: "News",
  description,
  path: "/news",
});

export default async function NewsPage() {
  const posts = await getPosts();
  const ordered = [
    ...posts.filter((post) => post.featured),
    ...posts.filter((post) => !post.featured),
  ];
  return (
    <>
      <PageHero eyebrow="News" title="Latest from Fusion" intro={description} />
      <div className="container-page py-14 sm:py-20">
        {ordered.length ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ordered.map((post, index) => (
              <li key={post.id}>
                <Reveal delay={(index % 3) * 0.06}>
                  <NewsCard post={post} />
                </Reveal>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>No news yet. Check back soon.</EmptyState>
        )}
      </div>
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "News", path: "/news" },
        ])}
      />
    </>
  );
}
