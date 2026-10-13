import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/admin/auth-forms";
import { AuthShell } from "@/components/admin/auth-shell";
import { getCurrentAdmin, requestDb } from "@/lib/dal";
import { C } from "@/lib/db/schema";

// Reads the database on every request; see app/admin/layout.tsx.
export const instant = false;

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div className="mt-8 h-64 animate-pulse rounded bg-mist" />}>
        <Access />
      </Suspense>
    </AuthShell>
  );
}

async function Access() {
  if (await getCurrentAdmin()) redirect("/admin");

  const db = await requestDb();
  if ((await db.collection(C.admins).estimatedDocumentCount()) === 0) {
    redirect("/admin/register");
  }

  return (
    <>
      <h1 className="heading-display mt-8 text-3xl">Admin sign in</h1>
      <p className="mb-6 mt-2 text-sm text-muted">Sign in to manage the website.</p>
      <LoginForm />
      <div className="mt-6 space-y-2 border-t border-line pt-5 text-sm text-muted">
        <p>
          Have an access code?{" "}
          <Link href="/admin/register" className="font-medium text-brand hover:underline">
            Create an admin account
          </Link>
        </p>
        <p>Forgot your password? Ask a super admin for a reset link.</p>
      </div>
    </>
  );
}
