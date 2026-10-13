// Copies the content of the old SQLite database (.data/fusion.db) into
// MongoDB. Safe to run any number of times: rows are matched on their SQLite
// id (stored as legacyId) and only inserted when missing, so nothing is
// duplicated and nothing already in MongoDB (including later edits made in
// /admin) is overwritten. It never deletes anything, in either database.
//
// Usage: npm run db:migrate-sqlite
import { existsSync } from "node:fs";
import { createClient } from "@libsql/client";
import { MongoClient } from "mongodb";

const file = process.env.SQLITE_PATH ?? ".data/fusion.db";
if (!existsSync(file)) {
  console.log(`No SQLite database at ${file}; nothing to migrate.`);
  process.exit(0);
}
if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is not set. Run with --env-file=.env.local.");
  process.exit(1);
}

const sqlite = createClient({ url: `file:${file}` });
const mongo = new MongoClient(process.env.MONGODB_URI);
await mongo.connect();
const db = mongo.db(process.env.MONGODB_DB || "fusion");

const date = (seconds) => (seconds == null ? null : new Date(Number(seconds) * 1000));
const bool = (value, fallback) => (value == null ? fallback : Number(value) === 1);
const text = (value) => (value == null ? "" : String(value));

async function rows(table) {
  try {
    return (await sqlite.execute(`select * from ${table}`)).rows;
  } catch {
    return [];
  }
}

const report = [];

async function migrate(table, collection, map) {
  const source = await rows(table);
  const result = { table, collection, found: source.length, inserted: 0, skipped: 0, errors: 0 };
  for (const row of source) {
    try {
      const doc = await map(row);
      const outcome = await db.collection(collection).updateOne(
        { legacyId: Number(row.id) },
        { $setOnInsert: { ...doc, legacyId: Number(row.id) } },
        { upsert: true },
      );
      if (outcome.upsertedCount) result.inserted++;
      else result.skipped++;
    } catch (error) {
      result.errors++;
      console.error(`  ${table} #${row.id}: ${error.message}`);
    }
  }
  report.push(result);
}

await migrate("work", "work", (r) => ({
  title: text(r.title),
  slug: text(r.slug),
  category: text(r.category),
  summary: text(r.summary),
  body: text(r.body),
  client: text(r.client),
  date: date(r.date),
  cover: text(r.cover),
  gallery: (() => {
    try {
      const list = JSON.parse(text(r.gallery) || "[]");
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  })(),
  youtube: "",
  youtubeId: "",
  liveUrl: "",
  partnerId: "",
  featured: bool(r.featured, false),
  published: bool(r.published, true),
  sortOrder: Number(r.sort_order ?? 0),
  seoTitle: "",
  seoDescription: "",
  createdAt: date(r.created_at) ?? new Date(),
  updatedAt: date(r.updated_at) ?? new Date(),
}));

await migrate("posts", "posts", (r) => ({
  title: text(r.title),
  slug: text(r.slug),
  excerpt: text(r.excerpt),
  body: text(r.body),
  cover: text(r.cover),
  youtube: "",
  youtubeId: "",
  publishedAt: date(r.published_at),
  featured: false,
  published: bool(r.published, true),
  seoTitle: "",
  seoDescription: "",
  createdAt: date(r.created_at) ?? new Date(),
  updatedAt: date(r.updated_at) ?? new Date(),
}));

await migrate("services", "services", (r) => ({
  title: text(r.title),
  description: text(r.description),
  icon: text(r.icon) || "trophy",
  sortOrder: Number(r.sort_order ?? 0),
  createdAt: date(r.created_at) ?? new Date(),
  updatedAt: date(r.updated_at) ?? new Date(),
}));

await migrate("partners", "partners", (r) => ({
  name: text(r.name),
  logo: text(r.logo),
  url: text(r.url),
  description: "",
  category: "partner",
  featured: false,
  published: true,
  sortOrder: Number(r.sort_order ?? 0),
  createdAt: date(r.created_at) ?? new Date(),
  updatedAt: date(r.updated_at) ?? new Date(),
}));

await migrate("messages", "messages", (r) => ({
  name: text(r.name),
  email: text(r.email),
  subject: text(r.subject),
  body: text(r.body),
  ip: text(r.ip),
  read: bool(r.read, false),
  createdAt: date(r.created_at) ?? new Date(),
}));

// Site settings: copied once, never over settings already edited in MongoDB.
const [settingsRow] = await rows("settings");
if (settingsRow) {
  const fields = ["site_name", "tagline", "description", "about", "stats", "email", "phone", "address", "twitter", "instagram", "youtube", "twitch", "discord", "og_image"];
  const camel = (s) => s.replace(/_(\w)/g, (_, c) => c.toUpperCase());
  const values = Object.fromEntries(fields.map((f) => [camel(f), text(settingsRow[f])]));
  const outcome = await db
    .collection("settings")
    .updateOne({ _id: "site" }, { $setOnInsert: values }, { upsert: true });
  report.push({ table: "settings", collection: "settings", found: 1, inserted: outcome.upsertedCount, skipped: outcome.upsertedCount ? 0 : 1, errors: 0 });
}

const [adminRow] = await rows("admin");
if (adminRow) {
  console.log("Note: the old single admin account is not migrated. Create the first account at /admin/register with the access code.");
}

console.log("\nMigration report (SQLite → MongoDB)");
console.table(report);
const errors = report.reduce((sum, r) => sum + r.errors, 0);
await mongo.close();
process.exit(errors ? 1 : 0);
