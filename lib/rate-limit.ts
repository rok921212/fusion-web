import "server-only";
import { getDb } from "@/lib/db";
import { C } from "@/lib/db/schema";

// Counts recent attempts per key (for example "login:ip:1.2.3.4") in
// MongoDB, so limits hold across server instances. Old attempts expire
// through a TTL index.

export async function isLimited(key: string, max: number, windowMs: number) {
  const db = await getDb();
  const recent = await db.collection(C.loginAttempts).countDocuments({
    key,
    createdAt: { $gt: new Date(Date.now() - windowMs) },
  });
  return recent >= max;
}

export async function recordAttempt(...keys: string[]) {
  const db = await getDb();
  const createdAt = new Date();
  await db.collection(C.loginAttempts).insertMany(keys.map((key) => ({ key, createdAt })));
}

export async function clearAttempts(key: string) {
  const db = await getDb();
  await db.collection(C.loginAttempts).deleteMany({ key });
}

/** A short pause that grows with recent failures, to slow down guessing. */
export async function progressiveDelay(key: string) {
  const db = await getDb();
  const failures = await db.collection(C.loginAttempts).countDocuments({
    key,
    createdAt: { $gt: new Date(Date.now() - 15 * 60 * 1000) },
  });
  const ms = Math.min(failures * 400, 3000);
  if (ms) await new Promise((resolve) => setTimeout(resolve, ms));
}
