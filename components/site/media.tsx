import Image from "next/image";
import { cn, isAllowedImageUrl } from "@/lib/utils";
import { isYoutubeThumbnail } from "@/lib/youtube";

type MediaProps = {
  src?: string | null;
  alt: string;
  /** Shown on the branded placeholder when there is no image. */
  label?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
};

// Image with a fixed aspect ratio set by the caller, or a branded placeholder
// when nothing has been uploaded yet. Shows uploaded images and YouTube
// thumbnails (used as covers for items with a video but no upload).
export function Media({
  src,
  alt,
  label,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  priority,
  className,
}: MediaProps) {
  return (
    <div className={cn("relative overflow-hidden bg-ink", className)}>
      {src && (isAllowedImageUrl(src) || isYoutubeThumbnail(src)) ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-end bg-[repeating-linear-gradient(135deg,transparent_0_22px,rgba(255,255,255,0.04)_22px_44px)] p-5"
        >
          <div className="absolute -right-10 -top-10 size-40 rotate-12 bg-brand" />
          <span className="heading-display relative text-3xl text-white/90">
            {label ?? alt}
          </span>
        </div>
      )}
    </div>
  );
}
