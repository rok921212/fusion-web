import type { Db, Document, ObjectId, WithId } from "mongodb";
import type { Role } from "../permissions";

export type { Role };

// Collection names, the shape of each document, and the indexes they need.
// Documents are read through plain() so pages only ever see string ids and
// never MongoDB driver objects (which cannot cross the cache boundary).

export const C = {
  admins: "admins",
  sessions: "sessions",
  invitations: "invitations",
  loginAttempts: "login_attempts",
  auditLogs: "audit_logs",
  settings: "settings",
  work: "work",
  posts: "posts",
  videos: "videos",
  services: "services",
  partners: "partners",
  links: "links",
  socials: "socials",
  messages: "messages",
  media: "media",
} as const;

type Timestamps = { createdAt: Date; updatedAt: Date };
type Entity<T> = T & Timestamps & { id: string };

export type Work = Entity<{
  title: string;
  slug: string;
  category: string;
  summary: string;
  body: string;
  client: string;
  date: Date | null;
  cover: string;
  gallery: string[];
  youtube: string;
  liveUrl: string;
  partnerId: string;
  featured: boolean;
  published: boolean;
  sortOrder: number;
  seoTitle: string;
  seoDescription: string;
}>;

export type Post = Entity<{
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  cover: string;
  youtube: string;
  publishedAt: Date | null;
  featured: boolean;
  published: boolean;
  seoTitle: string;
  seoDescription: string;
}>;

export type Video = Entity<{
  title: string;
  youtube: string;
  youtubeId: string;
  description: string;
  category: string;
  publishedAt: Date | null;
  featured: boolean;
  published: boolean;
  sortOrder: number;
}>;

export type Service = Entity<{
  title: string;
  description: string;
  icon: string;
  sortOrder: number;
}>;

export type Partner = Entity<{
  name: string;
  logo: string;
  url: string;
  description: string;
  category: string;
  featured: boolean;
  published: boolean;
  sortOrder: number;
}>;

export type SiteLink = Entity<{
  title: string;
  url: string;
  description: string;
  category: string;
  featured: boolean;
  published: boolean;
  sortOrder: number;
  expiresAt: Date | null;
}>;

export type SocialLink = Entity<{
  name: string;
  url: string;
  /** "si:<slug>" or "generic:<name>"; empty to detect from the URL. */
  icon: string;
  /** Uploaded PNG icon; replaces `icon` when set. */
  iconImage: string;
  published: boolean;
  sortOrder: number;
}>;

export type Message = {
  id: string;
  name: string;
  email: string;
  subject: string;
  body: string;
  ip: string;
  read: boolean;
  createdAt: Date;
};

export type AdminDoc = {
  _id: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
};

export type SessionDoc = {
  _id: ObjectId;
  tokenHash: string;
  adminId: ObjectId;
  expiresAt: Date;
  createdAt: Date;
  ip: string;
  userAgent: string;
};

export type InvitationDoc = {
  _id: ObjectId;
  tokenHash: string;
  kind: "invite" | "reset";
  email: string;
  name: string;
  role: Role;
  /** For password resets: the account being reset. */
  adminId: ObjectId | null;
  createdBy: ObjectId;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
};

export type MediaDoc = {
  _id: ObjectId;
  url: string;
  name: string;
  size: number;
  type: string;
  uploadedBy: string;
  createdAt: Date;
};

/** Turns a stored document into a plain object with a string `id`. */
export function plain<T>(doc: WithId<Document>): T {
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest } as T;
}

let indexes: Promise<void> | undefined;

export function ensureIndexes(db: Db) {
  indexes ??= (async () => {
    // Each index is created on its own: one failure (for example duplicate
    // slugs created before the index existed) is logged and must not stop
    // the site from reading and writing.
    const results = await Promise.allSettled([
      db.collection(C.admins).createIndex({ email: 1 }, { unique: true }),
      db.collection(C.sessions).createIndex({ tokenHash: 1 }, { unique: true }),
      db.collection(C.sessions).createIndex({ adminId: 1 }),
      db.collection(C.sessions).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      db.collection(C.invitations).createIndex({ tokenHash: 1 }, { unique: true }),
      // Kept a week after expiry so the admin list can still show them.
      db
        .collection(C.invitations)
        .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 7 * 86400 }),
      db.collection(C.loginAttempts).createIndex({ key: 1, createdAt: -1 }),
      db
        .collection(C.loginAttempts)
        .createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 }),
      db.collection(C.auditLogs).createIndex({ createdAt: -1 }),
      db.collection(C.work).createIndex({ slug: 1 }, { unique: true }),
      db.collection(C.work).createIndex({ published: 1, sortOrder: 1, date: -1 }),
      db.collection(C.posts).createIndex({ slug: 1 }, { unique: true }),
      db.collection(C.posts).createIndex({ published: 1, publishedAt: -1 }),
      db.collection(C.videos).createIndex({ published: 1, sortOrder: 1, publishedAt: -1 }),
      db.collection(C.partners).createIndex({ published: 1, sortOrder: 1 }),
      db.collection(C.links).createIndex({ published: 1, category: 1, sortOrder: 1 }),
      db.collection(C.socials).createIndex({ published: 1, sortOrder: 1 }),
      db.collection(C.messages).createIndex({ createdAt: -1 }),
      db.collection(C.messages).createIndex({ ip: 1, createdAt: -1 }),
      db.collection(C.media).createIndex({ createdAt: -1 }),
      // Lets the migration script upsert the same SQLite rows more than once.
      ...[C.work, C.posts, C.partners, C.services, C.messages].map(
        (name) =>
          db
            .collection(name)
            .createIndex({ legacyId: 1 }, { unique: true, sparse: true }),
      ),
    ]);
    for (const result of results) {
      if (result.status === "rejected") {
        console.error("MongoDB index could not be created:", result.reason?.message ?? result.reason);
      }
    }
  })();
  return indexes;
}
