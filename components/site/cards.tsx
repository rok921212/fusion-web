import {
  ArrowUpRight,
  CalendarDays,
  Gamepad2,
  Handshake,
  Megaphone,
  Palette,
  ShieldCheck,
  TrendingUp,
  Trophy,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { partnerCategories } from "@/lib/admin/resources";
import type { Partner, Post, SiteLink, Work } from "@/lib/db/schema";
import { formatDate, isAllowedImageUrl } from "@/lib/utils";
import { coverFor } from "@/lib/youtube";
import { Media } from "./media";

const icons: Record<string, LucideIcon> = {
  trophy: Trophy,
  users: Users,
  video: Video,
  megaphone: Megaphone,
  calendar: CalendarDays,
  handshake: Handshake,
  gamepad: Gamepad2,
  chart: TrendingUp,
  palette: Palette,
  shield: ShieldCheck,
};

export function WorkCard({ item, priority }: { item: Work; priority?: boolean }) {
  return (
    <Link
      href={`/portfolio/${item.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-white transition-shadow hover:shadow-lg"
    >
      <Media
        src={coverFor(item)}
        alt={item.title}
        priority={priority}
        className="aspect-[4/3]"
      />
      <div className="flex flex-1 flex-col p-6">
        {item.category && (
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">
            {item.category}
          </p>
        )}
        <h3 className="heading-display mt-2 flex items-start justify-between gap-3 text-2xl">
          {item.title}
          <ArrowUpRight className="mt-0.5 size-5 shrink-0 text-muted transition-colors group-hover:text-brand" />
        </h3>
        {item.summary && (
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">
            {item.summary}
          </p>
        )}
      </div>
    </Link>
  );
}

export function NewsCard({ post }: { post: Post }) {
  return (
    <Link
      href={`/news/${post.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-white transition-shadow hover:shadow-lg"
    >
      <Media src={coverFor(post)} alt={post.title} label="News" className="aspect-[16/9]" />
      <div className="flex flex-1 flex-col p-6">
        {post.publishedAt && (
          <time
            dateTime={new Date(post.publishedAt).toISOString()}
            className="text-xs font-medium uppercase tracking-widest text-muted"
          >
            {formatDate(post.publishedAt)}
          </time>
        )}
        <h3 className="mt-2 text-xl font-semibold leading-snug group-hover:text-brand">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">
            {post.excerpt}
          </p>
        )}
      </div>
    </Link>
  );
}

export function ServiceCard({
  service,
}: {
  service: { title: string; description: string; icon: string };
}) {
  const Icon = icons[service.icon] ?? Trophy;
  return (
    <div className="h-full rounded-lg border border-line bg-white p-7 transition-colors hover:border-brand">
      <span className="inline-flex size-12 items-center justify-center rounded-md bg-brand-soft text-brand">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h3 className="heading-display mt-5 text-2xl">{service.title}</h3>
      <p className="mt-3 leading-relaxed text-muted">{service.description}</p>
    </div>
  );
}

export function LiveLinkCard({ link }: { link: SiteLink }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex h-full items-center justify-between gap-4 rounded-lg border border-line bg-white p-6 transition-shadow hover:shadow-lg"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <span className="relative flex size-2.5 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2.5 rounded-full bg-brand" />
          </span>
          <h3 className="heading-display truncate text-2xl group-hover:text-brand">
            {link.title}
          </h3>
        </div>
        {link.description && (
          <p className="mt-2 line-clamp-2 text-sm text-muted">{link.description}</p>
        )}
      </div>
      <ArrowUpRight className="size-5 shrink-0 text-muted transition-colors group-hover:text-brand" />
    </a>
  );
}

export function PartnerCard({
  partner,
  projects = [],
}: {
  partner: Partner;
  projects?: Pick<Work, "id" | "title" | "slug">[];
}) {
  const content = (
    <>
      <div className="flex h-20 items-center">
        {partner.logo && isAllowedImageUrl(partner.logo) ? (
          <Image
            src={partner.logo}
            alt={partner.name}
            width={180}
            height={64}
            className="h-14 w-auto object-contain"
          />
        ) : (
          <span className="heading-display text-3xl">{partner.name}</span>
        )}
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-brand">
        {partnerCategories.find((c) => c.value === partner.category)?.label ?? "Partner"}
      </p>
      <h3 className="heading-display mt-1 flex items-start justify-between gap-3 text-2xl">
        {partner.name}
        {partner.url && (
          <ArrowUpRight className="mt-0.5 size-5 shrink-0 text-muted transition-colors group-hover:text-brand" />
        )}
      </h3>
      {partner.description && (
        <p className="mt-3 text-sm leading-relaxed text-muted">{partner.description}</p>
      )}
    </>
  );
  return (
    <div className="group flex h-full flex-col rounded-lg border border-line bg-white p-6 transition-shadow hover:shadow-lg">
      {partner.url ? (
        <a href={partner.url} target="_blank" rel="noopener noreferrer" className="block">
          {content}
        </a>
      ) : (
        content
      )}
      {projects.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            Collaborations
          </p>
          <ul className="mt-2 space-y-1">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/portfolio/${project.slug}`}
                  className="text-sm font-medium hover:text-brand"
                >
                  {project.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
