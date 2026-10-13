import "server-only";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { getDb } from "@/lib/db";
import { C, type AdminDoc, type SessionDoc } from "@/lib/db/schema";
import { can, type Permission, type Role } from "@/lib/permissions";
import { clientIp } from "@/lib/request";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session-token";

export type CurrentAdmin = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: Role;
  sessionId: string;
};

/**
 * The database for request-time reads (outside "use cache"). Waiting for
 * connection() first tells Next.js this work belongs to the request, not the
 * prerender: the MongoDB driver reads the clock, which prerendering forbids.
 */
export async function requestDb() {
  await connection();
  return getDb();
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

const BCRYPT_COST = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function newToken() {
  return randomBytes(32).toString("base64url");
}

/** The signed-in administrator, or null. Cached for the current request. */
export const getCurrentAdmin = cache(async (): Promise<CurrentAdmin | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 128) return null;

  const db = await requestDb();
  const session = await db.collection<SessionDoc>(C.sessions).findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;

  // Deactivated accounts lose access immediately, whatever sessions they hold.
  const admin = await db
    .collection<AdminDoc>(C.admins)
    .findOne({ _id: session.adminId, active: true });
  if (!admin) return null;

  return {
    id: admin._id.toString(),
    name: admin.name,
    email: admin.email,
    username: admin.username ?? null,
    role: admin.role,
    sessionId: session._id.toString(),
  };
});

/**
 * Call at the top of every admin page, server action and route handler.
 * Redirects to the login page, or to the access-denied page when the
 * signed-in administrator lacks `permission`.
 */
export async function requireAdmin(permission?: Permission) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  if (permission && !can(admin.role, permission)) redirect("/admin/denied");
  return admin;
}

/** Starts a fresh session; any session cookie already present is replaced. */
export async function createSession(adminId: ObjectId) {
  const token = newToken();
  const now = new Date();
  const db = await getDb();
  await db.collection(C.sessions).insertOne({
    tokenHash: hashToken(token),
    adminId,
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_MAX_AGE * 1000),
    ip: await clientIp(),
    userAgent: ((await headers()).get("user-agent") ?? "").slice(0, 200),
  });

  const jar = await cookies();
  const previous = jar.get(SESSION_COOKIE)?.value;
  if (previous) {
    await db.collection(C.sessions).deleteOne({ tokenHash: hashToken(previous) });
  }
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function deleteSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.collection(C.sessions).deleteOne({ tokenHash: hashToken(token) });
  }
  jar.delete(SESSION_COOKIE);
}

/** Signs an administrator out everywhere, optionally keeping one session. */
export async function revokeSessions(adminId: ObjectId, keepSessionId?: string) {
  const db = await getDb();
  const filter: Record<string, unknown> = { adminId };
  if (keepSessionId) filter._id = { $ne: new ObjectId(keepSessionId) };
  const { deletedCount } = await db.collection(C.sessions).deleteMany(filter);
  return deletedCount;
}
