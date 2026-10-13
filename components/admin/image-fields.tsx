"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useId, useState } from "react";

async function uploadImage(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch("/api/admin/upload", { method: "POST", body });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? "Upload failed.");
  return result.url;
}

function Thumb({ url, onRemove }: { url: string; onRemove: () => void }) {
  return (
    <div className="relative size-28 overflow-hidden rounded-md border border-line bg-mist">
      <Image src={url} alt="" fill sizes="112px" className="object-cover" />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove image"
        className="absolute right-1 top-1 inline-flex size-7 items-center justify-center rounded-full bg-ink/80 text-white hover:bg-brand"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

function Picker({
  id,
  multiple,
  busy,
  onFiles,
}: {
  id: string;
  multiple?: boolean;
  busy: boolean;
  onFiles: (files: File[]) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex size-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-muted/60 bg-white text-xs font-medium text-muted hover:border-brand hover:text-brand has-focus-visible:outline-2 has-focus-visible:outline-brand"
    >
      {busy ? (
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      ) : (
        <ImagePlus className="size-5" aria-hidden="true" />
      )}
      {busy ? "Uploading…" : multiple ? "Add images" : "Upload"}
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        multiple={multiple}
        disabled={busy}
        className="sr-only"
        onChange={(event) => {
          onFiles([...(event.target.files ?? [])]);
          event.target.value = "";
        }}
      />
    </label>
  );
}

function useUploader(onUploaded: (url: string) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(files: File[]) {
    setBusy(true);
    setError("");
    try {
      for (const file of files) onUploaded(await uploadImage(file));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, upload };
}

export function ImageField({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: string;
}) {
  const id = useId();
  const [url, setUrl] = useState(defaultValue);
  const { busy, error, upload } = useUploader(setUrl);

  return (
    <div>
      <input type="hidden" name={name} value={url} />
      <div className="flex gap-3">
        {url && <Thumb url={url} onRemove={() => setUrl("")} />}
        <Picker id={id} busy={busy} onFiles={(files) => upload(files.slice(0, 1))} />
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-brand">
          {error}
        </p>
      )}
    </div>
  );
}

export function GalleryField({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: string[];
}) {
  const id = useId();
  const [urls, setUrls] = useState(defaultValue);
  const { busy, error, upload } = useUploader((url) =>
    setUrls((current) => [...current, url]),
  );

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(urls)} />
      <div className="flex flex-wrap gap-3">
        {urls.map((url) => (
          <Thumb
            key={url}
            url={url}
            onRemove={() => setUrls((current) => current.filter((u) => u !== url))}
          />
        ))}
        <Picker id={id} multiple busy={busy} onFiles={upload} />
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-brand">
          {error}
        </p>
      )}
    </div>
  );
}
