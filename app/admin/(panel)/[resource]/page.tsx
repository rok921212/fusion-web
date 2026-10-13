import { Copy, ExternalLink, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Badge, Empty, Notice, PageHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { bulkPublish, deleteRecord, duplicateRecord } from "@/lib/actions/admin";
import { getResource, resources, type ResourceKey } from "@/lib/admin/resources";
import { tables, type Row } from "@/lib/admin/tables";
import { requestDb, requireAdmin } from "@/lib/dal";
import { plain } from "@/lib/db/schema";
import { can } from "@/lib/permissions";
import { formatDate, isAllowedImageUrl } from "@/lib/utils";
import { escapeRegex } from "@/lib/validation";
import { youtubeThumbnail } from "@/lib/youtube";

// Checks the session on the server on every request; see app/admin/layout.tsx.
export const instant = false;

const PAGE_SIZE = 25;

export function generateStaticParams() {
  return Object.keys(resources).map((resource) => ({ resource }));
}

function Cell({ value, field }: { value: unknown; field?: { options?: readonly { value: string; label: string }[] } }) {
  if (typeof value === "boolean") {
    return value ? <Badge tone="green">Yes</Badge> : <Badge>No</Badge>;
  }
  if (value instanceof Date) return formatDate(value);
  const text = String(value ?? "");
  const option = field?.options?.find((o) => o.value === text);
  return option?.label ?? (text || "—");
}

function thumbnailOf(row: Row) {
  if (typeof row.youtubeId === "string" && row.youtubeId) return youtubeThumbnail(row.youtubeId);
  for (const name of ["cover", "logo", "photo"]) {
    const value = row[name];
    if (typeof value === "string" && value && isAllowedImageUrl(value)) return value;
  }
  return null;
}

export default async function ResourceListPage({
  params,
  searchParams,
}: PageProps<"/admin/[resource]">) {
  const admin = await requireAdmin();
  const { resource: key } = await params;
  const resource = getResource(key);
  if (!resource) notFound();

  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 80) : "";
  const status = query.status === "draft" || query.status === "live" ? query.status : "";
  const page = Math.max(1, Number.parseInt(String(query.page ?? "1"), 10) || 1);

  const resourceKey = key as ResourceKey;
  const { collection, sort, searchField } = tables[resourceKey];
  const hasPublish = resource.fields.some((f) => f.name === "published");
  const hasThumb = resource.fields.some((f) =>
    ["image", "youtube"].includes(f.type) && ["cover", "logo", "photo", "youtube"].includes(f.name),
  );

  const filter: Record<string, unknown> = {};
  if (q) filter[searchField] = { $regex: escapeRegex(q), $options: "i" };
  if (hasPublish && status === "draft") filter.published = false;
  if (hasPublish && status === "live") filter.published = { $ne: false };

  const db = await requestDb();
  const [docs, total] = await Promise.all([
    db
      .collection(collection)
      .find(filter)
      .sort(sort)
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .toArray(),
    db.collection(collection).countDocuments(filter),
  ]);
  const rows = docs.map((doc) => plain<Row>(doc));
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fieldOf = (name: string) => resource.fields.find((field) => field.name === name);
  const labelOf = (name: string) => fieldOf(name)?.label ?? name;

  const canDelete = can(admin.role, "content.delete");
  const canPublish = hasPublish && can(admin.role, "content.publish");
  const href = (next: Record<string, string | number>) => {
    const params = new URLSearchParams();
    const merged = { q, status, page, ...next };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "page" && v === 1)) params.set(k, String(v));
    const search = params.toString();
    return `/admin/${key}${search ? `?${search}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title={resource.label}
        description={`${total} ${total === 1 ? resource.singular : `${resource.singular}s`}${q ? ` matching "${q}"` : ""}.`}
        actions={
          <Button asChild>
            <Link href={`/admin/${key}/new`}>
              <Plus /> Add {resource.singular}
            </Link>
          </Button>
        }
      />

      {query.saved && <Notice>Saved. The website has been updated.</Notice>}
      {query.deleted && <Notice>Deleted.</Notice>}
      {!can(admin.role, "content.publish") && hasPublish && (
        <Notice tone="info">
          You can create and edit drafts. An admin publishes them to the website.
        </Notice>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form className="relative min-w-60 flex-1" role="search">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <Input
            name="q"
            defaultValue={q}
            placeholder={`Search by ${labelOf(searchField).toLowerCase()}…`}
            aria-label={`Search ${resource.label}`}
            className="pl-9"
          />
          {status && <input type="hidden" name="status" value={status} />}
        </form>
        {hasPublish && (
          <div className="flex rounded-md border border-line bg-white p-1 text-sm" role="group" aria-label="Filter by status">
            {[
              ["", "All"],
              ["live", "Published"],
              ["draft", "Drafts"],
            ].map(([value, label]) => (
              <Link
                key={value}
                href={href({ status: value, page: 1 })}
                aria-current={status === value ? "true" : undefined}
                className={
                  status === value
                    ? "rounded bg-ink px-3 py-1.5 font-medium text-white"
                    : "rounded px-3 py-1.5 text-muted hover:text-ink"
                }
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <Empty>
          {q || status ? "Nothing matches these filters." : `Nothing here yet. Add your first ${resource.singular}.`}
        </Empty>
      ) : (
        <>
          {canPublish && (
            <form id="bulk" action={bulkPublish.bind(null, resourceKey)} className="mb-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">With selected:</span>
              <Button type="submit" name="intent" value="publish" size="sm" variant="outline">
                Publish
              </Button>
              <Button type="submit" name="intent" value="unpublish" size="sm" variant="outline">
                Unpublish
              </Button>
            </form>
          )}
          <div className="overflow-x-auto rounded-lg border border-line bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-mist text-xs uppercase tracking-wider text-muted">
                <tr>
                  {canPublish && (
                    <th scope="col" className="w-10 px-4 py-3">
                      <span className="sr-only">Select</span>
                    </th>
                  )}
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {labelOf(resource.titleField)}
                  </th>
                  {resource.columns.map((column) => (
                    <th key={column} scope="col" className="px-4 py-3 font-semibold">
                      {labelOf(column)}
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => {
                  const title = String(row[resource.titleField]);
                  const thumb = hasThumb ? thumbnailOf(row) : null;
                  return (
                    <tr key={row.id} className="transition-colors hover:bg-mist/60">
                      {canPublish && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            name="ids"
                            value={row.id}
                            form="bulk"
                            aria-label={`Select ${title}`}
                            className="size-4 accent-brand"
                          />
                        </td>
                      )}
                      <th scope="row" className="px-4 py-3 font-medium">
                        <Link href={`/admin/${key}/${row.id}`} className="flex items-center gap-3 hover:text-brand">
                          {hasThumb && (
                            <span className="relative size-10 shrink-0 overflow-hidden rounded bg-mist">
                              {thumb && <Image src={thumb} alt="" fill sizes="40px" className="object-cover" />}
                            </span>
                          )}
                          <span className="line-clamp-2">{title}</span>
                        </Link>
                      </th>
                      {resource.columns.map((column) => (
                        <td key={column} className="max-w-56 truncate px-4 py-3 text-ink-soft">
                          <Cell value={row[column]} field={fieldOf(column)} />
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {resource.publicPath && typeof row.slug === "string" && row.published !== false && (
                            <Button asChild variant="ghost" size="sm">
                              <a
                                href={`${resource.publicPath}/${row.slug}`}
                                target="_blank"
                                rel="noopener"
                                aria-label={`View ${title} on the site`}
                              >
                                <ExternalLink />
                              </a>
                            </Button>
                          )}
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/admin/${key}/${row.id}`} aria-label={`Edit ${title}`}>
                              <Pencil />
                            </Link>
                          </Button>
                          <form action={duplicateRecord.bind(null, resourceKey, row.id)}>
                            <Button type="submit" variant="ghost" size="sm" aria-label={`Duplicate ${title}`}>
                              <Copy />
                            </Button>
                          </form>
                          {canDelete && (
                            <form action={deleteRecord.bind(null, resourceKey, row.id)}>
                              <ConfirmButton
                                message={`Delete "${title}"? This cannot be undone.`}
                                aria-label={`Delete ${title}`}
                              >
                                <Trash2 />
                              </ConfirmButton>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <nav aria-label="Pages" className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted">
                Page {page} of {pages}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={href({ page: page - 1 })}>Previous</Link>
                  </Button>
                )}
                {page < pages && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={href({ page: page + 1 })}>Next</Link>
                  </Button>
                )}
              </div>
            </nav>
          )}
        </>
      )}
    </>
  );
}
