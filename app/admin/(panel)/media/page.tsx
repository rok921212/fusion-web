import { Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { CopyUrl, MediaUploader } from "@/components/admin/media-uploader";
import { Empty, Notice, PageHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { deleteMedia } from "@/lib/actions/media";
import { requestDb, requireAdmin } from "@/lib/dal";
import { C, type MediaDoc } from "@/lib/db/schema";
import { mediaUsage } from "@/lib/media";
import { can } from "@/lib/permissions";
import { formatDate, isAllowedImageUrl } from "@/lib/utils";
import { OBJECT_ID } from "@/lib/validation";

// Checks the session on the server on every request; see app/admin/layout.tsx.
export const instant = false;

export const metadata = { title: "Media library" };

function size(bytes: number) {
  return bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default async function MediaPage({ searchParams }: PageProps<"/admin/media">) {
  const admin = await requireAdmin("media.upload");
  const query = await searchParams;
  const db = await requestDb();
  const items = await db
    .collection<MediaDoc>(C.media)
    .find({})
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();

  const inUseId = typeof query.inUse === "string" && OBJECT_ID.test(query.inUse) ? query.inUse : null;
  const inUseItem = inUseId ? items.find((item) => item._id.toString() === inUseId) : null;
  const inUseWhere = inUseItem ? await mediaUsage(inUseItem.url) : [];
  const canDelete = can(admin.role, "media.delete");

  return (
    <>
      <PageHeader
        title="Media library"
        description="Every uploaded image. Images are also uploaded straight from content forms. JPG, PNG, WebP, AVIF or GIF up to 4 MB."
        actions={<MediaUploader />}
      />
      {query.deleted && <Notice>Image deleted.</Notice>}
      {inUseItem && (
        <Notice tone="error">
          This image is still used by: {inUseWhere.join(", ")}. Deleting it will
          leave a gap on those pages.{" "}
          <form action={deleteMedia.bind(null, inUseItem._id.toString())} className="mt-3 flex gap-2">
            <input type="hidden" name="force" value="1" />
            <Button type="submit" variant="danger" size="sm">
              Delete anyway
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/media">Keep it</Link>
            </Button>
          </form>
        </Notice>
      )}
      {items.length === 0 ? (
        <Empty>No images uploaded yet.</Empty>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <li key={item._id.toString()} className="overflow-hidden rounded-lg border border-line bg-white">
              <div className="relative aspect-square bg-mist">
                {isAllowedImageUrl(item.url) && (
                  <Image src={item.url} alt={item.name} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />
                )}
              </div>
              <div className="space-y-1 p-3">
                <p className="truncate text-sm font-medium" title={item.name}>
                  {item.name}
                </p>
                <p className="text-xs text-muted">
                  {size(item.size)} · {formatDate(item.createdAt)}
                </p>
                <div className="flex items-center justify-between">
                  <CopyUrl url={item.url} />
                  {canDelete && (
                    <form action={deleteMedia.bind(null, item._id.toString())}>
                      <ConfirmButton message="Delete this image?" aria-label={`Delete ${item.name}`}>
                        <Trash2 />
                      </ConfirmButton>
                    </form>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
