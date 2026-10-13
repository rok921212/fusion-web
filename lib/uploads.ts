import path from "node:path";

export const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");

// SVG is deliberately excluded: it can carry scripts.
export const UPLOAD_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export const UPLOAD_NAME = /^[0-9a-f-]{36}\.(jpg|png|webp|avif|gif)$/;
