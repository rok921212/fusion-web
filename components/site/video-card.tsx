import { videoCategories } from "@/lib/admin/resources";
import type { Video } from "@/lib/db/schema";
import { formatDate } from "@/lib/utils";
import { LiteYouTube } from "./youtube";

export function VideoCard({ video }: { video: Video }) {
  const category = videoCategories.find((c) => c.value === video.category)?.label;
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-line bg-white transition-shadow hover:shadow-lg">
      <LiteYouTube id={video.youtubeId} title={video.title} />
      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand">
          {category}
          {video.publishedAt && (
            <time
              dateTime={new Date(video.publishedAt).toISOString()}
              className="ml-2 font-medium text-muted"
            >
              {formatDate(video.publishedAt)}
            </time>
          )}
        </p>
        <h3 className="mt-2 text-xl font-semibold leading-snug">{video.title}</h3>
        {video.description && (
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">
            {video.description}
          </p>
        )}
      </div>
    </article>
  );
}
