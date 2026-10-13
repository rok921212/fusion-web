import { LogOut } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ActiveSidebarNav, SidebarNav } from "@/components/admin/sidebar-nav";
import { Logo } from "@/components/site/logo";
import { logout } from "@/lib/actions/auth";
import { getCurrentAdmin } from "@/lib/dal";
import { roleLabels } from "@/lib/permissions";

// The shell is static. Every page inside calls requireAdmin() before it reads
// or renders anything, and streams in behind this Suspense boundary.
// Like the rest of /admin (see app/admin/layout.tsx), navigations here check
// the session on the server and are allowed to wait for it.
export const instant = false;

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      {/* On phones the bar stays pinned to the top so the menu is always in reach. */}
      <aside className="sticky top-0 z-30 flex shrink-0 flex-col gap-2 bg-ink px-3 pb-2 pt-2 text-white shadow-lg lg:h-screen lg:w-64 lg:gap-6 lg:overflow-y-auto lg:p-5 lg:shadow-none">
        <div className="flex items-center justify-between">
          <Logo name="Fusion Esports" label="Admin" />
          <form action={logout} className="lg:hidden">
            <button
              type="submit"
              aria-label="Sign out"
              className="inline-flex size-10 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="size-5" />
            </button>
          </form>
        </div>
        <nav aria-label="Admin" className="lg:flex-1">
          <Suspense fallback={<SidebarNav />}>
            <Nav />
          </Suspense>
        </nav>
        <Suspense fallback={null}>
          <Profile />
        </Suspense>
      </aside>
      <main className="min-w-0 flex-1 bg-mist p-4 sm:p-8">
        <div className="mx-auto max-w-6xl">
          <Suspense
            fallback={
              <div className="space-y-4" aria-busy="true">
                <div className="h-10 w-56 animate-pulse rounded bg-line" />
                <div className="h-72 animate-pulse rounded-lg bg-line" />
              </div>
            }
          >
            {children}
          </Suspense>
        </div>
      </main>
    </div>
  );
}

async function Nav() {
  const admin = await getCurrentAdmin();
  return admin ? <ActiveSidebarNav role={admin.role} /> : <SidebarNav />;
}

async function Profile() {
  const admin = await getCurrentAdmin();
  if (!admin) return null;
  return (
    <div className="hidden border-t border-white/10 pt-4 lg:block">
      <Link
        href="/admin/account"
        className="block rounded-md px-3 py-2 hover:bg-white/10"
      >
        <p className="truncate text-sm font-semibold">{admin.name}</p>
        <p className="truncate text-xs text-white/50">{roleLabels[admin.role]}</p>
      </Link>
      <form action={logout}>
        <button
          type="submit"
          className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </button>
      </form>
    </div>
  );
}
