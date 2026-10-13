// Accepts only YouTube hosts and returns the 11-character video id, so no
// admin-supplied URL or HTML ever reaches an iframe directly.

const HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtube-nocookie.com",
  "youtube-nocookie.com",
]);

const ID = /^[A-Za-z0-9_-]{11}$/;

export function youtubeId(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!HOSTS.has(url.hostname.toLowerCase())) return null;

  let candidate: string | null | undefined;
  if (url.hostname.toLowerCase() === "youtu.be") {
    candidate = url.pathname.split("/")[1];
  } else if (url.pathname === "/watch") {
    candidate = url.searchParams.get("v");
  } else {
    const match = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/]+)/);
    candidate = match?.[1];
  }
  return candidate && ID.test(candidate) ? candidate : null;
}

export function youtubeThumbnail(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

const THUMBNAIL = /^https:\/\/i\.ytimg\.com\/vi\/[A-Za-z0-9_-]{11}\/(?:hq|mq|sd|maxres)default\.jpg$/;

/** A thumbnail produced by youtubeThumbnail(), safe to display. */
export function isYoutubeThumbnail(url: string) {
  return THUMBNAIL.test(url);
}

/**
 * The cover to show for a portfolio project or article: the uploaded cover,
 * or else the thumbnail of its YouTube video, or "" when it has neither.
 */
export function coverFor(item: { cover?: string; youtube?: string; youtubeId?: string }) {
  if (item.cover) return item.cover;
  const id = item.youtubeId || (item.youtube ? youtubeId(item.youtube) : null);
  return id ? youtubeThumbnail(id) : "";
}

/** Privacy-enhanced embed that only starts after the visitor clicks play. */
export function youtubeEmbed(id: string) {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
}

export function youtubeWatch(id: string) {
  return `https://www.youtube.com/watch?v=${id}`;
}
