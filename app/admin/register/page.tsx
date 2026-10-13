import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RegisterForm } from "@/components/admin/auth-forms";
import { AuthShell } from "@/components/admin/auth-shell";
import { getCurrentAdmin, requestDb } from "@/lib/dal";
import { C } from "@/lib/db/schema";
import { roleLabels } from "@/lib/permissions";
import { getSecuritySettings } from "@/lib/security";

// Reads the database on every request; see app/admin/layout.tsx.
export const instant = false;

export const metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div className="mt-8 h-96 animate-pulse rounded bg-mist" />}>
        <Register />
      </Suspense>
    </AuthShell>
  );
}

async function Register() {
  if (await getCurrentAdmin()) redirect("/admin");

  const db = await requestDb();
  const first = (await db.collection(C.admins).estimatedDocumentCount()) === 0;
  const security = await getSecuritySettings();
  const enabled = !!process.env.ADMIN_INVITE_SECRET && (first || security.codeSignup);

  return (
    <>
      <h1 className="heading-display mt-8 text-3xl">
        {first ? "Set up the admin portal" : "Create an admin account"}
      </h1>
      {enabled ? (
        <>
          <p className="mb-6 mt-2 text-sm text-muted">
            {first
              ? "No administrator exists yet. Enter the access code to create the first account; it becomes the super admin."
              : `Enter the access code to create an account. New accounts start as ${roleLabels[security.codeSignupRole]}; a super admin can change the role.`}
          </p>
          <RegisterForm first={first} />
        </>
      ) : (
        <p className="mb-2 mt-4 text-sm text-muted">
          Sign-up with an access code is turned off. Ask a super admin to send you
          an invitation link.
        </p>
      )}
      {!first && (
        <p className="mt-6 border-t border-line pt-5 text-sm text-muted">
          Already have an account?{" "}
          <Link href="/admin/login" className="font-medium text-brand hover:underline">
            Sign in
          </Link>
        </p>
      )}
    </>
  );
}
