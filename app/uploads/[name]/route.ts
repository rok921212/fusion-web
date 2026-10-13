import { readFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR, UPLOAD_NAME, UPLOAD_TYPES } from "@/lib/uploads";

// Serves images uploaded to the local disk (see app/api/admin/upload).
export async function GET(
  _request: Request,
  { params }: RouteContext<"/uploads/[name]">,
) {
  const { name } = await params;
  // The strict pattern also rules out path traversal.
  if (!UPLOAD_NAME.test(name)) return new Response(null, { status: 404 });

  const extension = name.split(".")[1];
  const contentType = Object.keys(UPLOAD_TYPES).find(
    (type) => UPLOAD_TYPES[type] === extension,
  )!;

  try {
    const data = await readFile(path.join(/* turbopackIgnore: true */ UPLOAD_DIR, name));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
