import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { audit } from "@/lib/audit";
import { getCurrentAdmin } from "@/lib/dal";
import { getDb } from "@/lib/db";
import { C } from "@/lib/db/schema";
import { can } from "@/lib/permissions";
import { UPLOAD_DIR, UPLOAD_TYPES } from "@/lib/uploads";
import { sniffImageType } from "@/lib/validation";

// Stays under the request body limit of serverless hosts.
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  // Cookies are SameSite=Lax, but check the origin too: uploads must come
  // from the admin panel itself.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "Cross-site upload refused." }, { status: 403 });
  }

  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!can(admin.role, "media.upload")) {
    return Response.json({ error: "You cannot upload files." }, { status: 403 });
  }

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES + 64 * 1024) {
    return Response.json({ error: "Images must be 4 MB or smaller." }, { status: 413 });
  }

  const file = (await request.formData()).get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file received." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Images must be 4 MB or smaller." }, { status: 413 });
  }

  // The file's own bytes decide its type, not its name or the browser.
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  const extension = type ? UPLOAD_TYPES[type] : undefined;
  if (!type || !extension) {
    return Response.json(
      { error: "Use a JPG, PNG, WebP, AVIF or GIF image." },
      { status: 415 },
    );
  }

  const name = `${randomUUID()}.${extension}`;
  let url: string;

  // Hosted storage when configured (needed on serverless hosts), otherwise
  // the local disk.
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`uploads/${name}`, Buffer.from(bytes), {
      access: "public",
      contentType: type,
    });
    url = blob.url;
  } else {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(/* turbopackIgnore: true */ UPLOAD_DIR, name), bytes);
    url = `/uploads/${name}`;
  }

  const db = await getDb();
  await db.collection(C.media).insertOne({
    url,
    name: file.name.replace(/[^\w.\- ]/g, "").slice(0, 120) || name,
    size: file.size,
    type,
    uploadedBy: admin.email,
    createdAt: new Date(),
  });
  await audit(admin, "media.uploaded", { type: "media", label: url });

  return Response.json({ url });
}
