// End-to-end test of the admin panel and the public site, in a real browser.
//
// Runs against a production server that uses a THROWAWAY database, which the
// test wipes first. It refuses to run unless the database name ends in
// "_test", so it can never touch the real site's data.
//
//   MONGODB_DB=fusion_test npx next build
//   MONGODB_DB=fusion_test npx next start -p 3100
//   npm run test:e2e
//
// Uses the locally installed Chrome (CHROME_PATH to override).
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { MongoClient } from "mongodb";
import { chromium } from "playwright-core";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const DB_NAME = process.env.MONGODB_DB ?? "";
const CODE = process.env.ADMIN_INVITE_SECRET;

if (!DB_NAME.endsWith("_test")) {
  console.error(`Refusing to run: MONGODB_DB must end in "_test" (got "${DB_NAME}").`);
  process.exit(1);
}
if (!CODE) {
  console.error("ADMIN_INVITE_SECRET is not set.");
  process.exit(1);
}

// Generated per run and never printed.
const password = () => `Aa1!${randomBytes(12).toString("base64url")}`;
const owner = { name: "Owner Test", username: "owner", email: "owner@example.test", password: password() };
const editor = { name: "Editor Test", username: "editor", email: "editor@example.test", password: password() };
const stamp = Date.now().toString(36);

// Empty every collection but keep them (and their indexes, which the running
// server created at start-up).
const mongo = await MongoClient.connect(process.env.MONGODB_URI);
for (const { name } of await mongo.db(DB_NAME).listCollections().toArray()) {
  await mongo.db(DB_NAME).collection(name).deleteMany({});
}

const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});

let passed = 0;
async function step(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}\n`, error);
    await browser.close();
    await mongo.close();
    process.exit(1);
  }
}

const ownerCtx = await browser.newContext({ baseURL: BASE });
const page = await ownerCtx.newPage();
page.setDefaultTimeout(20_000);
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

const publicText = async (path) => {
  const response = await page.request.get(path);
  return { status: response.status(), text: await response.text() };
};

console.log(`Admin e2e against ${BASE} (database ${DB_NAME})`);

await step("an empty site sends /admin to the first-account setup", async () => {
  await page.goto("/admin");
  await page.waitForURL(/\/admin\/register$/);
  await page.getByRole("heading", { name: "Set up the admin portal" }).waitFor();
});

await step("a wrong access code is rejected", async () => {
  await page.fill("#code", "not-the-code");
  await page.fill("#name", owner.name);
  await page.fill("#username", owner.username);
  await page.fill("#email", owner.email);
  await page.fill("#password", owner.password);
  await page.fill("#confirm", owner.password);
  await page.getByRole("button", { name: "Create super admin account" }).click();
  await page.getByText("This access code is not valid.").waitFor();
});

await step("the access code creates the first account as super admin", async () => {
  await page.fill("#code", CODE);
  await page.getByRole("button", { name: "Create super admin account" }).click();
  await page.waitForURL(/\/admin$/);
  await page.getByRole("heading", { name: /Welcome, Owner/ }).waitFor();
  await page.getByText("Super admin").first().waitFor();
});

await step("an invalid YouTube link is refused", async () => {
  await page.goto("/admin/portfolio/new");
  await page.fill("#title", `E2E Project ${stamp}`);
  await page.fill("#youtube", "https://evil.example/watch?v=dQw4w9WgXcQ");
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByText("Paste a YouTube link").waitFor();
});

await step("a published portfolio project appears on the site at once", async () => {
  await page.fill("#youtube", "https://youtu.be/dQw4w9WgXcQ");
  await page.fill("#summary", "Created by the end-to-end test.");
  await page.getByRole("button", { name: "Save" }).click();
  await page.waitForURL(/\/admin\/portfolio\?saved=1/);
  const list = await publicText("/portfolio");
  assert.ok(list.text.includes(`E2E Project ${stamp}`), "listed on /portfolio");
  await page.goto(`/portfolio/e2e-project-${stamp}`);
  await page.getByRole("button", { name: /Play video/ }).waitFor();
});

await step("a duplicate slug is refused", async () => {
  await page.goto("/admin/portfolio/new");
  await page.fill("#title", "Another");
  await page.fill("#slug", `e2e-project-${stamp}`);
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByText("Another item already uses this URL slug.").waitFor();
});

await step("videos and live links show on the home page", async () => {
  await page.goto("/admin/videos/new");
  await page.fill("#title", `E2E Video ${stamp}`);
  await page.fill("#youtube", "https://www.youtube.com/shorts/dQw4w9WgXcQ");
  await page.getByRole("button", { name: "Save" }).click();
  await page.waitForURL(/\/admin\/videos\?saved=1/);

  await page.goto("/admin/links/new");
  await page.fill("#title", `E2E Live ${stamp}`);
  await page.fill("#url", "https://www.twitch.tv/example");
  await page.getByRole("button", { name: "Save" }).click();
  await page.waitForURL(/\/admin\/links\?saved=1/);

  const home = await publicText("/");
  assert.ok(home.text.includes(`E2E Video ${stamp}`), "video on home page");
  assert.ok(home.text.includes(`E2E Live ${stamp}`), "live link on home page");
  const videos = await publicText("/videos");
  assert.ok(videos.text.includes(`E2E Video ${stamp}`), "video on /videos");
});

await step("home page settings and the announcement banner update the site", async () => {
  await page.goto("/admin/settings");
  await page.fill("#announcement", `E2E announcement ${stamp}`);
  await page.getByRole("button", { name: "Save settings" }).click();
  await page.getByText("Settings saved.").waitFor();
  const home = await publicText("/");
  assert.ok(home.text.includes(`E2E announcement ${stamp}`));
});

let inviteLink = "";
await step("a super admin can invite a content editor", async () => {
  await page.goto("/admin/administrators");
  await page.fill("#invite-name", editor.name);
  await page.fill("#invite-email", editor.email);
  await page.selectOption("#invite-role", "editor");
  await page.getByRole("button", { name: "Create invitation link" }).click();
  const link = page.getByRole("textbox", { name: "One-time link" });
  await link.waitFor();
  inviteLink = await link.inputValue();
  assert.match(inviteLink, /\/admin\/invite\/[\w-]{20,}$/);
});

const direct = { name: "Direct Test", username: "direct", email: "direct@example.test", password: password() };
await step("a super admin can create an account with a username and password", async () => {
  await page.goto("/admin/administrators");
  await page.fill("#name", direct.name);
  await page.fill("#username", direct.username);
  await page.fill("#email", direct.email);
  await page.selectOption("#create-role", "editor");
  await page.fill("#password", direct.password);
  await page.fill("#confirm", direct.password);
  await page.getByRole("button", { name: "Create administrator" }).click();
  await page.getByText(`can now sign in with the username “${direct.username}”`).waitFor();

  const ctx = await browser.newContext({ baseURL: BASE });
  const directPage = await ctx.newPage();
  await directPage.goto("/admin/login");
  await directPage.fill("#login", direct.username);
  await directPage.fill("#password", direct.password);
  await directPage.getByRole("button", { name: "Sign in" }).click();
  await directPage.waitForURL(/\/admin$/);
  await ctx.close();
});

const editorCtx = await browser.newContext({ baseURL: BASE });
const editorPage = await editorCtx.newPage();
editorPage.setDefaultTimeout(20_000);

await step("the invitation creates the editor account", async () => {
  await editorPage.goto(new URL(inviteLink).pathname);
  await editorPage.fill("#username", editor.username);
  await editorPage.fill("#password", editor.password);
  await editorPage.fill("#confirm", editor.password);
  await editorPage.getByRole("button", { name: "Create my account" }).click();
  await editorPage.waitForURL(/\/admin$/);
});

await step("an invitation link works only once", async () => {
  const other = await browser.newContext({ baseURL: BASE });
  const otherPage = await other.newPage();
  await otherPage.goto(new URL(inviteLink).pathname);
  await otherPage.getByRole("heading", { name: "Link not valid" }).waitFor();
  await other.close();
});

await step("editors cannot reach administrator, settings or audit pages", async () => {
  for (const path of ["/admin/administrators", "/admin/settings", "/admin/audit", "/admin/messages"]) {
    await editorPage.goto(path);
    await editorPage.waitForURL(/\/admin\/denied$/);
  }
  const nav = await editorPage.getByRole("navigation", { name: "Admin" }).innerText();
  assert.ok(!nav.includes("Administrators"), "no Administrators link for editors");
});

await step("an editor's new article is a hidden draft", async () => {
  await editorPage.goto("/admin/news/new");
  assert.ok(await editorPage.locator('input[name="published"]').isDisabled());
  await editorPage.fill("#title", `E2E Draft ${stamp}`);
  await editorPage.fill("#body", "Draft body.");
  await editorPage.getByRole("button", { name: "Save" }).click();
  await editorPage.waitForURL(/\/admin\/news\?saved=1/);
  assert.equal(await editorPage.getByRole("button", { name: /^Delete/ }).count(), 0, "no delete buttons");
  const list = await publicText("/news");
  assert.ok(!list.text.includes(`E2E Draft ${stamp}`), "draft not listed");
  const detail = await publicText(`/news/e2e-draft-${stamp}`);
  assert.ok(!detail.text.includes("Draft body."), "draft page not served");
});

await step("a super admin can publish the draft in bulk", async () => {
  await page.goto("/admin/news?status=draft");
  await page.getByRole("checkbox", { name: `Select E2E Draft ${stamp}` }).check();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.waitForURL(/\/admin\/news$/);
  const list = await publicText("/news");
  assert.ok(list.text.includes(`E2E Draft ${stamp}`), "published draft listed");
});

await step("deactivating the editor ends their session immediately", async () => {
  await page.goto("/admin/administrators");
  const row = page.locator("form", {
    has: page.getByRole("combobox", { name: `Role for ${editor.email}` }),
  });
  await row.getByRole("checkbox", { name: "Active" }).uncheck();
  await row.getByRole("button", { name: "Save" }).click();
  await page.getByText("Administrator updated.").waitFor();
  await editorPage.goto("/admin");
  await editorPage.waitForURL(/\/admin\/login$/);
});

await step("a deactivated account cannot sign in", async () => {
  await editorPage.fill("#login", editor.username);
  await editorPage.fill("#password", editor.password);
  await editorPage.getByRole("button", { name: "Sign in" }).click();
  await editorPage.getByText("Incorrect username/email or password.").waitFor();
});

await step("the last super admin cannot remove their own access", async () => {
  await page.goto("/admin/administrators");
  assert.equal(
    await page.getByRole("combobox", { name: `Role for ${owner.email}` }).count(),
    0,
    "no role control on your own account",
  );
});

await step("a super admin can delete another super admin", async () => {
  await page.goto("/admin/administrators");
  const row = page.locator("li", { has: page.getByText(direct.email) });
  await row.getByRole("combobox", { name: `Role for ${direct.email}` }).selectOption("super_admin");
  await row.getByRole("button", { name: "Save" }).click();
  await page.getByText("Administrator updated.").waitFor();
  assert.equal(
    await page.getByRole("button", { name: `Delete ${owner.email}` }).count(),
    0,
    "no delete control on your own account",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: `Delete ${direct.email}` }).click();
  await page.getByText("Administrator deleted.").waitFor();
  assert.equal(await page.getByText(direct.email).count(), 0);
});

await step("uploads require a session and real image bytes", async () => {
  const anon = await browser.newContext({ baseURL: BASE });
  const unauth = await anon.request.post("/api/admin/upload", {
    multipart: { file: { name: "a.png", mimeType: "image/png", buffer: Buffer.from("x") } },
  });
  assert.equal(unauth.status(), 401);
  await anon.close();

  const fake = await page.request.post("/api/admin/upload", {
    headers: { origin: BASE },
    multipart: {
      file: { name: "evil.png", mimeType: "image/png", buffer: Buffer.from("<script>alert(1)</script>") },
    },
  });
  assert.equal(fake.status(), 415, "HTML disguised as PNG is refused");

  const crossSite = await page.request.post("/api/admin/upload", {
    headers: { origin: "https://evil.example" },
    multipart: { file: { name: "a.png", mimeType: "image/png", buffer: Buffer.from("x") } },
  });
  assert.equal(crossSite.status(), 403, "cross-site upload refused");

  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  const ok = await page.request.post("/api/admin/upload", {
    headers: { origin: BASE },
    multipart: { file: { name: "pixel.png", mimeType: "image/png", buffer: png } },
  });
  assert.equal(ok.status(), 200);
  await page.goto("/admin/media");
  await page.getByText("pixel.png").waitFor();
});

await step("sign out, a wrong password, then sign in again", async () => {
  await page.goto("/admin");
  await page.getByRole("button", { name: "Sign out" }).last().click();
  await page.waitForURL(/\/admin\/login$/);
  await page.goto("/admin/portfolio");
  await page.waitForURL(/\/admin\/login$/);
  await page.fill("#login", owner.email);
  await page.fill("#password", "Wrong-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByText("Incorrect username/email or password.").waitFor();
  await page.fill("#login", owner.username);
  await page.fill("#password", owner.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin$/);
});

await step("the audit log records the important actions", async () => {
  await page.goto("/admin/audit");
  const text = await page.locator("table").innerText();
  for (const action of [
    "admin.register_with_code",
    "auth.register_bad_code",
    "content.created",
    "admin.invited",
    "admin.created",
    "admin.deleted",
    "admin.invitation_accepted",
    "content.published",
    "admin.updated",
    "media.uploaded",
    "auth.login_failed",
    "auth.login",
  ]) {
    assert.ok(text.includes(action), `audit has ${action}`);
  }
  assert.ok(!text.includes(owner.password) && !text.includes(CODE), "no secrets in the log");
});

await step("no secrets reach the browser", async () => {
  for (const path of ["/", "/admin", "/admin/administrators"]) {
    const { text } = await publicText(path);
    assert.ok(!text.includes(CODE), `access code absent from ${path}`);
    assert.ok(!text.includes("mongodb+srv"), `connection string absent from ${path}`);
  }
});

await step("pages render without browser console errors", async () => {
  const relevant = consoleErrors.filter(
    (text) => !/Failed to load resource: the server responded with a status of (401|403|404|415)/.test(text),
  );
  assert.deepEqual(relevant, []);
});

await browser.close();
await mongo.close();
console.log(`\n${passed} passed`);
