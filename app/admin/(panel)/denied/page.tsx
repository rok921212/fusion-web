import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { roleLabels } from "@/lib/permissions";

// Checks the session on the server on every request; see app/admin/layout.tsx.
export const instant = false;

export const metadata = { title: "No access" };

export default async function DeniedPage() {
  const admin = await requireAdmin();
  return (
    <div className="rounded-lg border border-line bg-white p-10 text-center">
      <h1 className="heading-display text-3xl">You do not have access to this</h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted">
        Your role is {roleLabels[admin.role]}. Ask a super admin if you need
        more access.
      </p>
      <Link href="/admin" className="mt-6 inline-block text-sm font-medium text-brand hover:underline">
        Back to the dashboard
      </Link>
    </div>
  );
}
