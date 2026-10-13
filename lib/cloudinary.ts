import "server-only";
import { createHash } from "node:crypto";

// Signed uploads through Cloudinary's REST API. The API secret stays on the
// server; each request carries a SHA-1 signature of its parameters instead.

const FOLDER = "fusion";

function config() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  return cloud && key && secret ? { cloud, key, secret } : null;
}

export function cloudinaryConfigured() {
  return config() !== null;
}

function sign(params: Record<string, string>, secret: string) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(payload + secret).digest("hex");
}

async function call(action: "upload" | "destroy", params: Record<string, string>, file?: Blob) {
  const cfg = config();
  if (!cfg) throw new Error("Cloudinary is not configured.");
  const signed = { ...params, timestamp: String(Math.floor(Date.now() / 1000)) };
  const body = new FormData();
  for (const [key, value] of Object.entries(signed)) body.set(key, value);
  body.set("api_key", cfg.key);
  body.set("signature", sign(signed, cfg.secret));
  if (file) body.set("file", file);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cfg.cloud)}/image/${action}`,
    { method: "POST", body },
  );
  const data = (await response.json().catch(() => ({}))) as {
    secure_url?: string;
    public_id?: string;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(`Cloudinary ${action} failed: ${data.error?.message ?? response.status}`);
  }
  return data;
}

/** Uploads image bytes and returns the public https URL and Cloudinary id. */
export async function uploadToCloudinary(bytes: Uint8Array, type: string, name: string) {
  const data = await call(
    "upload",
    { folder: FOLDER, public_id: name, overwrite: "false" },
    new Blob([bytes as BlobPart], { type }),
  );
  if (!data.secure_url || !data.public_id) throw new Error("Cloudinary returned no URL.");
  return { url: data.secure_url, publicId: data.public_id };
}

export async function deleteFromCloudinary(publicId: string) {
  await call("destroy", { public_id: publicId, invalidate: "true" });
}

/** Recovers the public id ("fusion/<uuid>") from a delivery URL. */
export function cloudinaryPublicId(url: string) {
  const match = url.match(
    /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+$/i,
  );
  return match?.[1] ?? null;
}
