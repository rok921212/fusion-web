"use server";

import { unlink } from "node:fs/promises";
import path from "node:path";
import { del } from "@vercel/blob";
import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/dal";
import { getDb } from "@/lib/db";
import { C, type MediaDoc } from "@/lib/db/schema";
import { mediaUsage } from "@/lib/media";
import { UPLOAD_DIR, UPLOAD_NAME } from "@/lib/uploads";
import { OBJECT_ID } from "@/lib/validation";

export async function deleteMedia(id: string, formData: FormData) {
  const admin = await requireAdmin("media.delete");
  if (!OBJECT_ID.test(id)) redirect("/admin/media");

  const db = await getDb();
  const media = db.collection<MediaDoc>(C.media);
  const item = await media.findOne({ _id: new ObjectId(id) });
  if (!item) redirect("/admin/media");

  // Images still shown on the site need an explicit second confirmation.
  const usage = await mediaUsage(item.url);
  if (usage.length && formData.get("force") !== "1") {
    redirect(`/admin/media?inUse=${id}`);
  }

  if (item.url.startsWith("/uploads/")) {
    const name = item.url.slice("/uploads/".length);
    if (UPLOAD_NAME.test(name)) {
      await unlink(path.join(/* turbopackIgnore: true */ UPLOAD_DIR, name)).catch(() => {});
    }
  } else if (process.env.BLOB_READ_WRITE_TOKEN) {
    await del(item.url).catch(() => {});
  }
  await media.deleteOne({ _id: item._id });
  await audit(admin, "media.deleted", { type: "media", id, label: item.url }, {
    wasInUse: usage.length > 0,
  });
  redirect("/admin/media?deleted=1");
}
