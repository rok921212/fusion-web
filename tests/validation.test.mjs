import assert from "node:assert/strict";
import { test } from "node:test";
import {
  escapeRegex,
  isHttpUrl,
  isSafeHref,
  passwordProblem,
  usernameProblem,
  safeRedirectPath,
  sniffImageType,
} from "../lib/validation.ts";

test("only http(s) URLs count as links", () => {
  assert.ok(isHttpUrl("https://example.com"));
  assert.ok(isHttpUrl("http://example.com/path?q=1"));
  assert.equal(isHttpUrl("javascript:alert(1)"), false);
  assert.equal(isHttpUrl("data:text/html,<script>"), false);
  assert.equal(isHttpUrl("//evil.com"), false);
});

test("button links allow site paths but not protocol-relative URLs", () => {
  assert.ok(isSafeHref("/contact"));
  assert.ok(isSafeHref("https://twitch.tv/fusion"));
  assert.equal(isSafeHref("//evil.com"), false);
  // Browsers treat "/\evil.com" like "//evil.com".
  assert.equal(isSafeHref(String.raw`/\evil.com`), false);
  assert.equal(isSafeHref("javascript:alert(1)"), false);
});

test("redirect targets stay on this site", () => {
  assert.equal(safeRedirectPath("/admin/news"), "/admin/news");
  assert.equal(safeRedirectPath("https://evil.com"), "/admin");
  assert.equal(safeRedirectPath("//evil.com"), "/admin");
  assert.equal(safeRedirectPath({ $gt: "" }), "/admin");
});

test("search text cannot inject regex operators", () => {
  const pattern = new RegExp(escapeRegex(".*(a+)+$"));
  assert.ok(pattern.test("x.*(a+)+$y"));
  assert.equal(pattern.test("anything"), false);
});

test("passwords need length and variety", () => {
  assert.ok(passwordProblem("short"));
  assert.ok(passwordProblem("alllowercaseletters"));
  assert.ok(passwordProblem("Shanahitman9!", "shanahitman@example.com"));
  assert.equal(passwordProblem("Correct-Horse-42"), null);
});

test("image type comes from the file bytes", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  const html = new TextEncoder().encode("<html><script>alert(1)</script>");
  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg">');
  assert.equal(sniffImageType(png), "image/png");
  assert.equal(sniffImageType(jpeg), "image/jpeg");
  assert.equal(sniffImageType(webp), "image/webp");
  assert.equal(sniffImageType(html), null);
  assert.equal(sniffImageType(svg), null);
});

test("usernames are short lowercase IDs without @", () => {
  assert.equal(usernameProblem("john"), null);
  assert.equal(usernameProblem("j.doe_2-x"), null);
  assert.ok(usernameProblem("jo"));
  assert.ok(usernameProblem("a".repeat(33)));
  assert.ok(usernameProblem("John"));
  assert.ok(usernameProblem("john@example.com"));
  assert.ok(usernameProblem(".john"));
  assert.ok(usernameProblem("jo hn"));
});

test("passwords may not contain the username", () => {
  assert.ok(passwordProblem("Fusionjohn-2026", "", "john"));
  assert.equal(passwordProblem("Fusion-Admin-2026", "", "john"), null);
});
