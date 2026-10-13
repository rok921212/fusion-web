import type { Metadata } from "next";

// /admin is not linked from the public site, is excluded from the sitemap and
// robots.txt, and is never indexed. Access control is the login, not secrecy.
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Fusion Admin" },
  robots: { index: false, follow: false },
};

// Every admin screen depends on who is signed in, and the session is checked
// against the database on each request so that deactivated or demoted
// accounts lose access at once. Navigations into /admin therefore wait for
// the server by design, instead of being prefetched or cached.
export const instant = false;

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
