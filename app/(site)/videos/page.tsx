import { Reveal } from "@/components/site/reveal";
import { EmptyState, PageHero } from "@/components/site/section";
import { VideoCard } from "@/components/site/video-card";
import { videoCategories } from "@/lib/admin/resources";
import { getVideos } from "@/lib/data";
import { buildMetadata, breadcrumbLd, JsonLd } from "@/lib/seo";

const description =
  "Fusion Esports on video: match highlights, tournament broadcasts, behind-the-scenes content and updates.";

export const metadata = buildMetadata({
  title: "Videos",
  description,
  path: "/videos",
});

export default async function VideosPage() {
  const videos = await getVideos();
  const featured = videos.filter((video) => video.featured).slice(0, 3);
  const groups = videoCategories
    .map((category) => ({
      ...category,
      videos: videos.filter((video) => video.category === category.value),
    }))
    .filter((group) => group.videos.length);

  return (
    <>
      <PageHero eyebrow="Videos" title="Watch Fusion" intro={description} />
      <div className="container-page space-y-16 py-14 sm:py-20">
        {videos.length === 0 && <EmptyState>Videos are coming soon.</EmptyState>}

        {featured.length > 0 && (
          <section aria-labelledby="featured-videos">
            <h2 id="featured-videos" className="heading-display mb-6 text-3xl sm:text-4xl">
              Featured
            </h2>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((video, index) => (
                <li key={video.id}>
                  <Reveal delay={index * 0.06}>
                    <VideoCard video={video} />
                  </Reveal>
                </li>
              ))}
            </ul>
          </section>
        )}

        {groups.map((group) => (
          <section key={group.value} aria-labelledby={`videos-${group.value}`}>
            <h2 id={`videos-${group.value}`} className="heading-display mb-6 text-3xl sm:text-4xl">
              {group.label}
            </h2>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {group.videos.map((video, index) => (
                <li key={video.id}>
                  <Reveal delay={(index % 3) * 0.06}>
                    <VideoCard video={video} />
                  </Reveal>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Videos", path: "/videos" },
        ])}
      />
    </>
  );
}
