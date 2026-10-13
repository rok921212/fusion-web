import { ObjectId } from "mongodb";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ResourceForm } from "@/components/admin/resource-form";
import { getResource, type ResourceKey } from "@/lib/admin/resources";
import { tables, type Row } from "@/lib/admin/tables";
import { resolveIcon } from "@/lib/brand-icons";
import { requestDb, requireAdmin } from "@/lib/dal";
import { C, plain } from "@/lib/db/schema";
import { can } from "@/lib/permissions";
import { OBJECT_ID } from "@/lib/validation";

// Checks the session on the server on every request; see app/admin/layout.tsx.
export const instant = false;

// Handles both /admin/<resource>/new and /admin/<resource>/<id>.
export default async function ResourceEditPage({
  params,
}: PageProps<"/admin/[resource]/[id]">) {
  const admin = await requireAdmin("content.edit");
  const { resource: key, id: idParam } = await params;
  const resource = getResource(key);
  if (!resource) notFound();

  const resourceKey = key as ResourceKey;
  const db = await requestDb();
  const isNew = idParam === "new";
  if (!isNew && !OBJECT_ID.test(idParam)) notFound();
  const id = isNew ? null : idParam;

  let values: Row | undefined;
  if (id !== null) {
    const doc = await db
      .collection(tables[resourceKey].collection)
      .findOne({ _id: new ObjectId(id) });
    if (!doc) notFound();
    values = plain<Row>(doc);
  }

  const types = new Set(resource.fields.map((f) => f.type));
  const options = async (collection: string, label: string) =>
    (
      await db
        .collection(collection)
        .find({})
        .project({ [label]: 1 })
        .sort({ [label]: 1 })
        .limit(500)
        .toArray()
    ).map((doc) => ({ id: doc._id.toString(), name: String(doc[label] ?? "") }));

  const partnerOptions = types.has("partner") ? await options(C.partners, "name") : [];
  const chosen =
    types.has("brandicon") && typeof values?.icon === "string" ? resolveIcon(values.icon) : null;
  const icon = chosen && {
    key: chosen.key,
    title: chosen.title,
    icon:
      chosen.kind === "brand"
        ? { kind: "brand" as const, path: chosen.path }
        : { kind: "generic" as const, name: chosen.name },
  };

  return (
    <>
      <Link
        href={`/admin/${key}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-brand"
      >
        <ArrowLeft className="size-4" /> {resource.label}
      </Link>
      <h1 className="heading-display mb-6 mt-3 text-4xl">
        {isNew ? `New ${resource.singular}` : `Edit ${resource.singular}`}
      </h1>
      <ResourceForm
        resourceKey={resourceKey}
        fields={resource.fields}
        id={id}
        values={values}
        partners={partnerOptions}
        icon={icon}
        canPublish={can(admin.role, "content.publish")}
      />
    </>
  );
}
