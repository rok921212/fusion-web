import assert from "node:assert/strict";
import { test } from "node:test";
import { coverFor, isYoutubeThumbnail, youtubeEmbed, youtubeId } from "../lib/youtube.ts";

const ID = "dQw4w9WgXcQ";

test("accepts the common YouTube URL formats", () => {
  for (const url of [
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=42s`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=abc`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}`,
    `https://www.youtube.com/live/${ID}`,
    `  https://youtu.be/${ID}  `,
  ]) {
    assert.equal(youtubeId(url), ID, url);
  }
});

test("rejects other hosts, look-alikes and malformed ids", () => {
  for (const url of [
    `https://evil.com/watch?v=${ID}`,
    `https://youtube.com.evil.com/watch?v=${ID}`,
    `https://notyoutube.com/watch?v=${ID}`,
    `javascript:alert(1)//youtube.com/watch?v=${ID}`,
    `ftp://youtube.com/watch?v=${ID}`,
    `https://www.youtube.com/watch?v=short`,
    `https://www.youtube.com/watch?v=${ID}"><script>`,
    `<iframe src="https://www.youtube.com/embed/${ID}"></iframe>`,
    "not a url",
    "",
  ]) {
    assert.equal(youtubeId(url), null, url);
  }
});

test("embeds use the privacy-enhanced domain", () => {
  assert.match(youtubeEmbed(ID), /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?/);
});

test("an uploaded cover wins; otherwise the video thumbnail is the cover", () => {
  assert.equal(coverFor({ cover: "/uploads/a.png", youtubeId: ID }), "/uploads/a.png");
  assert.equal(coverFor({ cover: "", youtubeId: ID }), `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`);
  assert.equal(coverFor({ cover: "", youtube: `https://youtu.be/${ID}` }), `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`);
  assert.equal(coverFor({ cover: "", youtube: "" }), "");
});

test("only real YouTube thumbnail addresses count as displayable thumbnails", () => {
  assert.ok(isYoutubeThumbnail(`https://i.ytimg.com/vi/${ID}/hqdefault.jpg`));
  assert.equal(isYoutubeThumbnail(`https://i.ytimg.com.evil.com/vi/${ID}/hqdefault.jpg`), false);
  assert.equal(isYoutubeThumbnail(`http://i.ytimg.com/vi/${ID}/hqdefault.jpg`), false);
  assert.equal(isYoutubeThumbnail(`https://i.ytimg.com/vi/${ID}/../../x.jpg`), false);
});
