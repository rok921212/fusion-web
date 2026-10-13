import {
  Briefcase,
  Handshake,
  Inbox,
  Newspaper,
  Plus,
  Users,
  Clapperboard,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Badge, Empty, PageHeader, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { resources, type ResourceKey } from "@/lib/admin/resources";
import { tables } from "@/lib/admin/tables";
import { requestDb, requireAdmin } from "@/lib/dal";
import { C } from "@/lib/db/schema";
import { can } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";

// Checks the session on the server on every request; see app/admin/layout.tsx.
export const instant = false;

export const metadata = { title: "Dashboard" };

const tracked: ResourceKey[] = ["portfolio", "news", "videos", "partners", "links"];

function Stat({
  href,
  label,
  value,
  detail,
  icon: Icon,
}: {
  href: string;
  label: string;
  value: number;
  detail?: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-lg border border-line bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <Icon
        aria-hidden="true"
        className="absolute -right-3 -top-3 size-20 text-mist transition-colors group-hover:text-brand-soft"
      />
      <p className="relative text-xs font-semibold uppercase tracking-widest text-muted">
        {label}
      </p>
      <p className="heading-display relative mt-2 text-5xl">{value}</p>
      {detail && <p className="relative mt-1 text-xs text-muted">{detail}</p>}
    </Link>
  );
}

export default async function DashboardPage() {
  const admin = await requireAdmin();
  const db = await requestDb();
  const now = new Date();

  const count = (collection: string, filter = {}) =>
    db.collection(collection).countDocuments(filter);

  const [
    workLive,
    workDrafts,
    newsLive,
    newsScheduled,
    videosLive,
    partnersLive,
    adminCount,
    unread,
    recentPerType,
    drafts,
    activity,
  ] = await Promise.all([
    count(C.work, { published: { $ne: false } }),
    count(C.work, { published: false }),
    count(C.posts, { published: { $ne: false } }),
    count(C.posts, { published: { $ne: false }, publishedAt: { $gt: now } }),
    count(C.videos, { published: { $ne: false } }),
    count(C.partners, { published: { $ne: false } }),
    count(C.admins, { active: true }),
    can(admin.role, "messages.read") ? count(C.messages, { read: false }) : 0,
    Promise.all(
      tracked.map(async (key) => {
        const docs = await db
          .collection(tables[key].collection)
          .find({})
          .sort({ updatedAt: -1 })
          .limit(5)
          .toArray();
        return docs.map((doc) => ({
          key,
          id: doc._id.toString(),
          title: String(doc[resources[key].titleField] ?? ""),
          updatedAt: doc.updatedAt as Date | undefined,
          updatedBy: doc.updatedBy as string | undefined,
          published: doc.published !== false,
        }));
      }),
    ),
    Promise.all(
      tracked.map(async (key) => {
        const docs = await db
          .collection(tables[key].collection)
          .find({ published: false })
          .sort({ updatedAt: -1 })
          .limit(5)
          .toArray();
        return docs.map((doc) => ({
          key,
          id: doc._id.toString(),
          title: String(doc[resources[key].titleField] ?? ""),
          updatedBy: doc.updatedBy as string | undefined,
        }));
      }),
    ),
    can(admin.role, "audit.read")
      ? db.collection(C.auditLogs).find({}).sort({ createdAt: -1 }).limit(8).toArray()
      : [],
  ]);

  const recent = recentPerType
    .flat()
    .filter((item) => item.updatedAt)
    .sort((a, b) => b.updatedAt!.getTime() - a.updatedAt!.getTime())
    .slice(0, 8);
  const waiting = drafts.flat().slice(0, 8);

  return (
    <>
      <PageHeader
        title={`Welcome, ${admin.name.split(" ")[0]}`}
        description="Everything on the public website is managed from here. Published changes appear on the site straight away."
        actions={
          <>
            <Button asChild size="sm">
              <Link href="/admin/portfolio/new">
                <Plus /> Project
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/videos/new">
                <Plus /> Video
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/news/new">
                <Plus /> Update
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/partners/new">
                <Plus /> Partner
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <Stat
          href="/admin/portfolio"
          label="Portfolio"
          value={workLive}
          detail={workDrafts ? `${workDrafts} draft${workDrafts === 1 ? "" : "s"}` : "published"}
          icon={Briefcase}
        />
        <Stat
          href="/admin/news"
          label="News"
          value={newsLive}
          detail={newsScheduled ? `${newsScheduled} scheduled` : "published"}
          icon={Newspaper}
        />
        <Stat href="/admin/videos" label="Videos" value={videosLive} detail="published" icon={Clapperboard} />
        <Stat href="/admin/partners" label="Partners" value={partnersLive} detail="active" icon={Handshake} />
        {can(admin.role, "admins.manage") ? (
          <Stat href="/admin/administrators" label="Admins" value={adminCount} detail="active accounts" icon={Users} />
        ) : (
          <Stat href="/admin/account" label="Admins" value={adminCount} detail="active accounts" icon={Users} />
        )}
        {can(admin.role, "messages.read") && (
          <Stat href="/admin/messages" label="Inbox" value={unread} detail="unread messages" icon={Inbox} />
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Recently updated">
          {recent.length ? (
            <ul className="divide-y divide-line">
              {recent.map((item) => (
                <li key={`${item.key}-${item.id}`} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/${item.key}/${item.id}`}
                      className="block truncate text-sm font-medium hover:text-brand"
                    >
                      {item.title}
                    </Link>
                    <p className="text-xs text-muted">
                      {resources[item.key].label} · {formatDate(item.updatedAt)}
                      {item.updatedBy && ` · ${item.updatedBy}`}
                    </p>
                  </div>
                  {item.published ? <Badge tone="green">Live</Badge> : <Badge>Draft</Badge>}
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-5">
              <Empty>No content yet. Use the buttons above to add your first item.</Empty>
            </div>
          )}
        </Panel>

        <Panel title="Awaiting publication">
          {waiting.length ? (
            <ul className="divide-y divide-line">
              {waiting.map((item) => (
                <li key={`${item.key}-${item.id}`} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/${item.key}/${item.id}`}
                      className="block truncate text-sm font-medium hover:text-brand"
                    >
                      {item.title}
                    </Link>
                    <p className="text-xs text-muted">
                      {resources[item.key].label}
                      {item.updatedBy && ` · by ${item.updatedBy}`}
                    </p>
                  </div>
                  <Badge tone="amber">Draft</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-muted">
              Nothing waiting. Drafts saved by content editors appear here.
            </p>
          )}
        </Panel>

        {can(admin.role, "audit.read") && (
          <Panel
            title="Recent activity"
            className="lg:col-span-2"
            action={
              <Link href="/admin/audit" className="text-sm font-medium hover:text-brand">
                Full audit log
              </Link>
            }
          >
            {activity.length ? (
              <ul className="divide-y divide-line">
                {activity.map((entry) => (
                  <li key={entry._id.toString()} className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3 text-sm">
                    <span>
                      <span className="font-medium">{entry.actorEmail ?? "Visitor"}</span>{" "}
                      <span className="text-muted">{String(entry.action).replace(/[._]/g, " ")}</span>
                      {entry.targetLabel && <span> · {entry.targetLabel}</span>}
                    </span>
                    <time className="text-xs text-muted">{formatDate(entry.createdAt)}</time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-10 text-center text-sm text-muted">No activity recorded yet.</p>
            )}
          </Panel>
        )}
      </div>
    </>
  );
}
