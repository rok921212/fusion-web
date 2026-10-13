import "server-only";
import { getDb } from "@/lib/db";
import { C } from "@/lib/db/schema";

const imageFields: Record<string, string[]> = {
  [C.work]: ["cover", "gallery"],
  [C.posts]: ["cover"],
  [C.partners]: ["logo"],
  [C.socials]: ["iconImage"],
  [C.settings]: ["ogImage"],
};

const labelFields: Record<string, string> = {
  [C.work]: "title",
  [C.posts]: "title",
  [C.partners]: "name",
  [C.socials]: "name",
  [C.settings]: "siteName",
};

/** Where an uploaded image is still used, as "Collection: title" labels. */
export async function mediaUsage(url: string) {
  const db = await getDb();
  const found = await Promise.all(
    Object.entries(imageFields).map(async ([collection, fields]) => {
      const docs = await db
        .collection(collection)
        .find({ $or: fields.map((field) => ({ [field]: url })) })
        .project({ [labelFields[collection]]: 1 })
        .limit(5)
        .toArray();
      return docs.map((doc) => `${collection}: ${String(doc[labelFields[collection]] ?? "")}`);
    }),
  );
  return found.flat();
}
