"use client";

import { Play } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { youtubeEmbed, youtubeThumbnail } from "@/lib/youtube";

/**
 * Shows the thumbnail only. The privacy-enhanced YouTube player is loaded
 * when the visitor presses play, so pages make no requests to YouTube and
 * nothing plays on its own.
 */
export function LiteYouTube({
  id,
  title,
  className,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
}: {
  id: string;
  title: string;
  className?: string;
  sizes?: string;
}) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className={cn("relative aspect-video overflow-hidden bg-ink", className)}>
      {playing ? (
        <iframe
          src={youtubeEmbed(id)}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play video: ${title}`}
          className="group/play absolute inset-0 size-full"
        >
          <Image
            src={youtubeThumbnail(id)}
            alt=""
            fill
            sizes={sizes}
            className="object-cover transition duration-500 group-hover/play:scale-105 motion-reduce:transition-none"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
          <span className="absolute left-1/2 top-1/2 inline-flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-white shadow-[0_0_0_8px_rgba(217,4,41,0.25)] transition group-hover/play:scale-110 motion-reduce:transition-none">
            <Play className="ml-1 size-7 fill-current" aria-hidden="true" />
          </span>
        </button>
      )}
    </div>
  );
}
