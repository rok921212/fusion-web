"use server";

import * as z from "zod";
import { getDb } from "@/lib/db";
import { C } from "@/lib/db/schema";
import { clientIp } from "@/lib/request";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(100),
  email: z.email("Please enter a valid email address."),
  subject: z.string().trim().max(150),
  body: z
    .string()
    .trim()
    .min(10, "Please write at least a couple of sentences.")
    .max(5000, "Please keep your message under 5,000 characters."),
});

export type ContactState =
  | {
      ok?: boolean;
      message?: string;
      errors?: Partial<Record<keyof z.infer<typeof schema>, string>>;
    }
  | undefined;

const MAX_PER_WINDOW = 3;
const WINDOW_MS = 10 * 60 * 1000;

export async function sendMessage(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  // Honeypot: real visitors never see or fill this field.
  if (formData.get("company")) return { ok: true };

  const parsed = schema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? "").trim(),
    subject: String(formData.get("subject") ?? ""),
    body: String(formData.get("body") ?? ""),
  });
  if (!parsed.success) {
    const errors: NonNullable<ContactState>["errors"] = {};
    for (const issue of parsed.error.issues) {
      errors[issue.path[0] as keyof typeof errors] ??= issue.message;
    }
    return { errors };
  }

  const db = await getDb();
  const messages = db.collection(C.messages);

  const ip = await clientIp();
  const recent = await messages.countDocuments({
    ip,
    createdAt: { $gt: new Date(Date.now() - WINDOW_MS) },
  });
  if (recent >= MAX_PER_WINDOW) {
    return { message: "You have sent several messages already. Please try again later." };
  }

  await messages.insertOne({
    ...parsed.data,
    ip,
    read: false,
    createdAt: new Date(),
  });
  return { ok: true };
}
