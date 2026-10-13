import "server-only";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { C } from "@/lib/db/schema";
import { clientIp } from "@/lib/request";

type Actor = { id: string; email: string } | null;

/**
 * Records a security-relevant or content-changing action. Never pass
 * passwords, tokens, access codes or cookies in `details`.
 */
export async function audit(
  actor: Actor,
  action: string,
  target?: { type: string; id?: string; label?: string },
  details?: Record<string, string | number | boolean | null>,
) {
  try {
    const db = await getDb();
    await db.collection(C.auditLogs).insertOne({
      requestId: randomUUID(),
      actorId: actor?.id ?? null,
      actorEmail: actor?.email ?? null,
      action,
      targetType: target?.type ?? null,
      targetId: target?.id ?? null,
      targetLabel: target?.label?.slice(0, 200) ?? null,
      details: details ?? null,
      ip: await clientIp(),
      createdAt: new Date(),
    });
  } catch (error) {
    // Auditing must never take down the action it describes.
    console.error("Audit log write failed", error);
  }
}
