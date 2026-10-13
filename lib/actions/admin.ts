"use server";

import { ObjectId, type Document } from "mongodb";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import {
  getResource,
  iconNames,
  type Field,
  type ResourceKey,
} from "@/lib/admin/resources";
import { tables } from "@/lib/admin/tables";
import { audit } from "@/lib/audit";
import { isIconKey } from "@/lib/brand-icons";
import { requireAdmin } from "@/lib/dal";
import { getDb } from "@/lib/db";
import { C } from "@/lib/db/schema";
import { can } from "@/lib/permissions";
import { defaultSettings, parseHeroWords, type SiteSettings } from "@/lib/site";
import { isAllowedImageUrl, slugify } from "@/lib/utils";
import { isHttpUrl, isSafeHref, OBJECT_ID } from "@/lib/validation";
import { youtubeId, youtubeWatch } from "@/lib/youtube";

export type FormState =
  | { errors?: Record<string, string>; message?: string; ok?: boolean }
  | undefined;

const LIMITS = { text: 200, textarea: 2000, markdown: 50000 } as const;

function toObjectId(id: string, fallback: string) {
  if (!OBJECT_ID.test(id)) redirect(fallback);
  return new ObjectId(id);
}

async function parseFields(fields: Field[], formData: FormData) {
  const values: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  const db = await getDb();

  for (const field of fields) {
    const raw = String(formData.get(field.name) ?? "").trim();

    switch (field.type) {
      case "checkbox":
        values[field.name] = formData.get(field.name) === "on";
        continue;
      case "number":
        values[field.name] = Math.max(-9999, Math.min(9999, Number.parseInt(raw, 10) || 0));
        continue;
      case "partner": {
        const exists =
          raw === "" ||
          (OBJECT_ID.test(raw) &&
            (await db.collection(C.partners).countDocuments({ _id: new ObjectId(raw) })) > 0);
        if (!exists) errors[field.name] = "Choose a partner from the list.";
        values[field.name] = exists ? raw : "";
        continue;
      }
      case "select": {
        const allowed = field.options?.map((option) => option.value) ?? [];
        values[field.name] = allowed.includes(raw) ? raw : (field.defaultValue ?? allowed[0] ?? "");
        continue;
      }
      case "date": {
        const date = raw ? new Date(raw) : null;
        if (date && Number.isNaN(date.getTime())) {
          errors[field.name] = "Enter a valid date.";
        }
        values[field.name] = date;
        continue;
      }
      case "slug": {
        const source = String(formData.get(field.slugFrom ?? "") ?? "");
        const slug = slugify(raw || source);
        if (!slug) errors[field.name] = "A URL slug is required.";
        values[field.name] = slug;
        continue;
      }
      case "image":
        if (raw && !isAllowedImageUrl(raw)) {
          errors[field.name] = "Upload the image instead of linking to it.";
        }
        values[field.name] = raw;
        continue;
      case "gallery": {
        let list: unknown = [];
        try {
          list = JSON.parse(raw || "[]");
        } catch {
          // handled below
        }
        const valid =
          Array.isArray(list) &&
          list.length <= 24 &&
          list.every((u) => typeof u === "string" && isAllowedImageUrl(u));
        if (!valid) errors[field.name] = "The gallery could not be saved.";
        values[field.name] = valid ? list : [];
        continue;
      }
      case "youtube": {
        const id = raw ? youtubeId(raw) : null;
        if (raw && !id) {
          errors[field.name] = "Paste a YouTube link, for example https://youtu.be/…";
        } else if (field.required && !id) {
          errors[field.name] = `${field.label} is required.`;
        }
        values[field.name] = id ? youtubeWatch(id) : "";
        values[`${field.name}Id`] = id ?? "";
        continue;
      }
      case "url":
        if (field.required && !raw) {
          errors[field.name] = `${field.label} is required.`;
        } else if (raw && (!isHttpUrl(raw) || raw.length > 500)) {
          errors[field.name] = "Enter a full URL starting with https://";
        }
        values[field.name] = raw;
        continue;
      case "brandicon":
        if (raw && !isIconKey(raw)) errors[field.name] = "Choose an icon from the list.";
        values[field.name] = raw && isIconKey(raw) ? raw : "";
        continue;
      case "icon":
        values[field.name] = (iconNames as readonly string[]).includes(raw)
          ? raw
          : iconNames[0];
        continue;
      default: {
        // Line endings are normalised so length checks match the textarea.
        const text = raw.replace(/\r\n/g, "\n");
        const max = field.max ?? LIMITS[field.type];
        if (field.required && !text) {
          errors[field.name] = `${field.label} is required.`;
        } else if (text.length > max) {
          errors[field.name] = `Keep this under ${max} characters.`;
        }
        values[field.name] = text;
      }
    }
  }
  return { values, errors };
}

function isDuplicateKey(error: unknown) {
  return (error as { code?: number })?.code === 11000;
}

export async function saveRecord(
  key: ResourceKey,
  id: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin("content.edit");

  const resource = getResource(key);
  if (!resource) return { message: "Unknown content type." };

  const { values, errors } = await parseFields(resource.fields, formData);
  if (Object.keys(errors).length) {
    return { errors, message: "Check the highlighted fields." };
  }

  // Editors save drafts: new items start unpublished and they cannot change
  // whether an existing item is live.
  const canPublish = can(admin.role, "content.publish");
  const hasPublishFlag = resource.fields.some((f) => f.name === "published");
  if (hasPublishFlag && !canPublish) {
    if (id === null) values.published = false;
    else delete values.published;
  }

  const { collection, tag } = tables[key];
  const db = await getDb();
  const now = new Date();
  const title = String(values[resource.titleField] ?? "");
  let recordId = id;

  // The unique index is the real guarantee; this gives a clear message even
  // when the index is still being built.
  if (typeof values.slug === "string") {
    const clash = await db.collection(collection).findOne(
      {
        slug: values.slug,
        ...(id !== null ? { _id: { $ne: toObjectId(id, `/admin/${key}`) } } : {}),
      },
      { projection: { _id: 1 } },
    );
    if (clash) {
      return {
        errors: { slug: "Another item already uses this URL slug." },
        message: "Check the highlighted fields.",
      };
    }
  }

  try {
    if (id === null) {
      const { insertedId } = await db
        .collection(collection)
        .insertOne({ ...values, createdAt: now, updatedAt: now, updatedBy: admin.email });
      recordId = insertedId.toString();
    } else {
      const result = await db
        .collection(collection)
        .updateOne(
          { _id: toObjectId(id, `/admin/${key}`) },
          { $set: { ...values, updatedAt: now, updatedBy: admin.email } },
        );
      if (!result.matchedCount) return { message: "This item no longer exists." };
    }
  } catch (error) {
    if (isDuplicateKey(error)) {
      return {
        errors: { slug: "Another item already uses this URL slug." },
        message: "Check the highlighted fields.",
      };
    }
    throw error;
  }

  await audit(admin, id === null ? "content.created" : "content.updated", {
    type: key,
    id: recordId ?? undefined,
    label: title,
  }, hasPublishFlag && typeof values.published === "boolean"
    ? { published: values.published }
    : undefined);
  updateTag(tag);
  redirect(`/admin/${key}?saved=1`);
}

export async function deleteRecord(key: ResourceKey, id: string) {
  const admin = await requireAdmin("content.delete");
  if (!getResource(key)) return;

  const { collection, tag } = tables[key];
  const _id = toObjectId(id, `/admin/${key}`);
  const db = await getDb();
  const doc = await db.collection(collection).findOneAndDelete({ _id });
  if (key === "partners") {
    await db.collection(C.work).updateMany({ partnerId: id }, { $set: { partnerId: "" } });
    updateTag("work");
  }

  const resource = getResource(key)!;
  await audit(admin, "content.deleted", {
    type: key,
    id,
    label: String(doc?.[resource.titleField] ?? ""),
  });
  updateTag(tag);
  redirect(`/admin/${key}?deleted=1`);
}

/** Copies an item as an unpublished draft and opens it for editing. */
export async function duplicateRecord(key: ResourceKey, id: string) {
  const admin = await requireAdmin("content.edit");
  const resource = getResource(key);
  if (!resource) return;

  const { collection } = tables[key];
  const db = await getDb();
  const source = await db
    .collection(collection)
    .findOne({ _id: toObjectId(id, `/admin/${key}`) });
  if (!source) redirect(`/admin/${key}`);

  const { _id, legacyId, ...copy } = source as Document;
  void _id;
  void legacyId;
  const titleField = resource.titleField;
  copy[titleField] = `${copy[titleField]} (copy)`.slice(0, 200);
  if ("slug" in copy) {
    copy.slug = `${String(copy.slug).slice(0, 60)}-copy-${Date.now().toString(36)}`;
  }
  if ("published" in copy) copy.published = false;
  if ("featured" in copy) copy.featured = false;
  const now = new Date();
  const { insertedId } = await db
    .collection(collection)
    .insertOne({ ...copy, createdAt: now, updatedAt: now, updatedBy: admin.email });

  await audit(admin, "content.duplicated", {
    type: key,
    id: insertedId.toString(),
    label: String(copy[titleField]),
  });
  redirect(`/admin/${key}/${insertedId.toString()}`);
}

/** Publishes or unpublishes several items at once from the list view. */
export async function bulkPublish(key: ResourceKey, formData: FormData) {
  const admin = await requireAdmin("content.publish");
  const resource = getResource(key);
  if (!resource?.fields.some((f) => f.name === "published")) return;

  const ids = formData
    .getAll("ids")
    .map(String)
    .filter((id) => OBJECT_ID.test(id))
    .slice(0, 200)
    .map((id) => new ObjectId(id));
  const published = formData.get("intent") === "publish";
  if (ids.length) {
    const { collection, tag } = tables[key];
    const db = await getDb();
    await db
      .collection(collection)
      .updateMany(
        { _id: { $in: ids } },
        { $set: { published, updatedAt: new Date(), updatedBy: admin.email } },
      );
    await audit(admin, published ? "content.published" : "content.unpublished", {
      type: key,
    }, { count: ids.length });
    updateTag(tag);
  }
  redirect(`/admin/${key}`);
}

const optionalHref = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || isSafeHref(v), "Use a full https:// URL or a path such as /contact");

const settingsSchema = z.object({
  siteName: z.string().trim().min(1, "The site name is required.").max(80),
  tagline: z.string().trim().max(160),
  description: z.string().trim().max(320),
  about: z.string().trim().max(20000),
  stats: z.string().trim().max(600),
  email: z.union([z.literal(""), z.email("Enter a valid email address.")]),
  phone: z.string().trim().max(40),
  address: z.string().trim().max(300),
  whatsapp: z
    .string()
    .trim()
    .max(300)
    .refine(
      (v) => v === "" || /^\+?[\d\s()-]{6,20}$/.test(v) || isHttpUrl(v),
      "Enter a phone number with country code (e.g. +977 98…) or a wa.me link.",
    ),
  ogImage: z
    .string()
    .trim()
    .refine((v) => v === "" || isAllowedImageUrl(v), "Upload the image instead of linking to it."),
  heroPrefix: z.string().trim().max(24, "Keep this under 24 characters."),
  heroWords: z
    .string()
    .trim()
    .max(300)
    .refine(
      (v) => v.split(/\r?\n/).filter((w) => w.trim()).length <= 8,
      "Use at most eight words, one per line.",
    )
    .refine(
      (v) => parseHeroWords(v).every((word) => word.length <= 16),
      "Keep each word to 16 characters or fewer so it fits the headline.",
    ),
  heroPrimaryLabel: z.string().trim().max(40),
  heroPrimaryHref: optionalHref,
  heroSecondaryLabel: z.string().trim().max(40),
  heroSecondaryHref: optionalHref,
  announcement: z.string().trim().max(160),
  announcementHref: optionalHref,
});

const sectionKeys = Object.keys(defaultSettings).filter(
  (k) => typeof defaultSettings[k as keyof SiteSettings] === "boolean",
);

export async function saveSettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin("settings.manage");

  const parsed = settingsSchema.safeParse(
    Object.fromEntries(
      Object.keys(settingsSchema.shape).map((name) => [
        name,
        String(formData.get(name) ?? "").trim(),
      ]),
    ),
  );
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      errors[String(issue.path[0])] ??= issue.message;
    }
    return { errors, message: "Check the highlighted fields." };
  }

  const sections = Object.fromEntries(
    sectionKeys.map((name) => [name, formData.get(name) === "on"]),
  );
  const db = await getDb();
  await db
    .collection<{ _id: string }>(C.settings)
    .updateOne(
      { _id: "site" },
      { $set: { ...parsed.data, ...sections, updatedAt: new Date(), updatedBy: admin.email } },
      { upsert: true },
    );

  await audit(admin, "settings.updated", { type: "settings", id: "site" });
  updateTag("settings");
  return { ok: true, message: "Settings saved. The website is updated." };
}

export async function setMessageRead(id: string, read: boolean) {
  await requireAdmin("messages.read");
  const db = await getDb();
  await db
    .collection(C.messages)
    .updateOne({ _id: toObjectId(id, "/admin/messages") }, { $set: { read } });
  redirect("/admin/messages");
}

export async function deleteMessage(id: string) {
  const admin = await requireAdmin("messages.read");
  const db = await getDb();
  await db.collection(C.messages).deleteOne({ _id: toObjectId(id, "/admin/messages") });
  await audit(admin, "message.deleted", { type: "message", id });
  redirect("/admin/messages");
}
