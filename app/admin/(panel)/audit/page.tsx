import Link from "next/link";
import { Empty, PageHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requestDb, requireAdmin } from "@/lib/dal";
import { C } from "@/lib/db/schema";

// Checks the session on the server on every request; see app/admin/layout.tsx.
export const instant = false;

export const metadata = { title: "Audit log" };

const PAGE_SIZE = 50;

const timeFormat = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requireAdmin("audit.read");
  const query = await searchParams;
  const page = Math.max(1, Number.parseInt(String(query.page ?? "1"), 10) || 1);

  const db = await requestDb();
  const entries = await db
    .collection(C.auditLogs)
    .find({})
    .sort({ createdAt: -1 })
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE + 1)
    .toArray();
  const hasMore = entries.length > PAGE_SIZE;

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Sign-ins, account changes, content changes, uploads and setting changes. Times are UTC. Entries cannot be edited."
      />
      {entries.length === 0 ? (
        <Empty>No activity recorded yet.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-mist text-xs uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">When</th>
                <th scope="col" className="px-4 py-3 font-semibold">Who</th>
                <th scope="col" className="px-4 py-3 font-semibold">Action</th>
                <th scope="col" className="px-4 py-3 font-semibold">Item</th>
                <th scope="col" className="px-4 py-3 font-semibold">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {entries.slice(0, PAGE_SIZE).map((entry) => (
                <tr key={entry._id.toString()}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted">
                    {timeFormat.format(entry.createdAt)}
                  </td>
                  <td className="px-4 py-2.5">{entry.actorEmail ?? "—"}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{entry.action}</td>
                  <td className="max-w-72 truncate px-4 py-2.5 text-ink-soft">
                    {[entry.targetType, entry.targetLabel].filter(Boolean).join(" · ")}
                    {entry.details && (
                      <span className="ml-1 text-xs text-muted">
                        {Object.entries(entry.details as Record<string, unknown>)
                          .map(([k, v]) => `${k}: ${String(v)}`)
                          .join(", ")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted">{entry.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <nav aria-label="Pages" className="mt-4 flex justify-end gap-2">
        {page > 1 && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/audit?page=${page - 1}`}>Newer</Link>
          </Button>
        )}
        {hasMore && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/audit?page=${page + 1}`}>Older</Link>
          </Button>
        )}
      </nav>
    </>
  );
}
