"use client";

import Image from "next/image";
import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/form";
import { youtubeId, youtubeThumbnail } from "@/lib/youtube";

// URL input with a live thumbnail preview, so the admin can see at once
// whether the link points at the right video.
export function YoutubeField({
  defaultValue,
  ...props
}: Omit<ComponentProps<typeof Input>, "defaultValue"> & { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  const id = value ? youtubeId(value) : null;
  return (
    <div className="space-y-3">
      <Input
        {...props}
        type="url"
        inputMode="url"
        placeholder="https://www.youtube.com/watch?v=…"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      {value && !id && (
        <p className="text-xs text-brand">This does not look like a YouTube video link yet.</p>
      )}
      {id && (
        <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-md border border-line bg-ink">
          <Image src={youtubeThumbnail(id)} alt="Video preview" fill sizes="384px" className="object-cover" />
        </div>
      )}
    </div>
  );
}
