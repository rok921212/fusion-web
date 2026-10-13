"use client";

import {
  Briefcase,
  ExternalLink,
  FileClock,
  Handshake,
  Images,
  Inbox,
  LayoutDashboard,
  Link2,
  Newspaper,
  PanelsTopLeft,
  Share2,
  UserCog,
  Users,
  Wrench,
  Clapperboard,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { can, type Permission, type Role } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: LucideIcon; permission?: Permission };

const groups: { title: string; items: Item[] }[] = [
  {
    title: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Content",
    items: [
      { href: "/admin/portfolio", label: "Portfolio", icon: Briefcase },
      { href: "/admin/videos", label: "YouTube & Videos", icon: Clapperboard },
      { href: "/admin/news", label: "News & Updates", icon: Newspaper },
      { href: "/admin/partners", label: "Partners", icon: Handshake },
      { href: "/admin/socials", label: "Social Links", icon: Share2 },
      { href: "/admin/links", label: "Website Links", icon: Link2 },
      { href: "/admin/services", label: "Services", icon: Wrench },
    ],
  },
  {
    title: "Website",
    items: [
      {
        href: "/admin/settings",
        label: "Home page & settings",
        icon: PanelsTopLeft,
        permission: "settings.manage",
      },
      { href: "/admin/media", label: "Media library", icon: Images, permission: "media.upload" },
      { href: "/admin/messages", label: "Messages", icon: Inbox, permission: "messages.read" },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        href: "/admin/administrators",
        label: "Administrators",
        icon: Users,
        permission: "admins.manage",
      },
      { href: "/admin/audit", label: "Audit log", icon: FileClock, permission: "audit.read" },
      { href: "/admin/account", label: "My account", icon: UserCog },
    ],
  },
];

export function SidebarNav({ pathname, role }: { pathname?: string; role?: Role }) {
  const reduce = useReducedMotion();
  const strip = useRef<HTMLDivElement>(null);

  // On phones the menu is a horizontal strip: keep the current page's link
  // in view instead of leaving it scrolled off to the side.
  useEffect(() => {
    const node = strip.current;
    const current = node?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!node || !current || node.scrollWidth <= node.clientWidth) return;
    node.scrollTo({
      left: current.offsetLeft - (node.clientWidth - current.offsetWidth) / 2,
      behavior: reduce ? "auto" : "smooth",
    });
  }, [pathname, reduce]);

  return (
    <div
      ref={strip}
      className="-mx-3 flex snap-x gap-1 overflow-x-auto scroll-px-3 px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:snap-none lg:flex-col lg:gap-5 lg:overflow-visible lg:px-0"
    >
      {groups.map((group) => {
        const items = group.items.filter(
          (item) => !item.permission || (role && can(role, item.permission)),
        );
        if (!items.length) return null;
        return (
          <div key={group.title} className="contents lg:block">
            <p className="hidden px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40 lg:block">
              {group.title}
            </p>
            <ul className="contents lg:flex lg:flex-col lg:gap-0.5">
              {items.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname !== undefined &&
                  (href === "/admin" ? pathname === href : pathname.startsWith(href));
                return (
                  <li key={href} className="relative shrink-0 snap-start">
                    {active && (
                      <motion.span
                        layoutId="admin-nav-active"
                        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
                        className="absolute inset-0 rounded-md bg-brand"
                      />
                    )}
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex min-h-11 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium lg:min-h-0 lg:gap-3 text-white/70 transition-colors hover:bg-white/10 hover:text-white",
                        active && "text-white hover:bg-transparent",
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <a
        href="/"
        target="_blank"
        rel="noopener"
        className="flex min-h-11 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-white/70 lg:min-h-0 lg:gap-3 hover:bg-white/10 hover:text-white lg:border-t lg:border-white/10 lg:pt-4"
      >
        <ExternalLink className="size-4" aria-hidden="true" />
        View site
      </a>
    </div>
  );
}

export function ActiveSidebarNav({ role }: { role: Role }) {
  return <SidebarNav pathname={usePathname()} role={role} />;
}
