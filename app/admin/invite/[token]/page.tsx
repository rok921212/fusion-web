import Link from "next/link";
import { Suspense } from "react";
import { AcceptInviteForm } from "@/components/admin/auth-forms";
import { AuthShell } from "@/components/admin/auth-shell";
import { getInvitation } from "@/lib/actions/auth";
import { roleLabels } from "@/lib/permissions";

// Reads the database on every request; see app/admin/layout.tsx.
export const instant = false;

export const metadata = { title: "Invitation" };

export default function InvitePage({ params }: PageProps<"/admin/invite/[token]">) {
  return (
    <AuthShell>
      <Suspense fallback={<div className="mt-8 h-72 animate-pulse rounded bg-mist" />}>
        <Invite params={params} />
      </Suspense>
    </AuthShell>
  );
}

async function Invite({ params }: Pick<PageProps<"/admin/invite/[token]">, "params">) {
  const { token } = await params;
  const invite = await getInvitation(token);

  if (!invite) {
    return (
      <>
        <h1 className="heading-display mt-8 text-3xl">Link not valid</h1>
        <p className="mt-2 text-sm text-muted">
          This link is invalid, has expired or has already been used. Ask a super
          admin for a new one.
        </p>
        <Link
          href="/admin/login"
          className="mt-6 inline-block text-sm font-medium text-brand hover:underline"
        >
          Go to sign in
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="heading-display mt-8 text-3xl">
        {invite.kind === "invite" ? "Join the admin team" : "Reset your password"}
      </h1>
      <p className="mb-6 mt-2 text-sm text-muted">
        {invite.kind === "invite"
          ? `You were invited as ${roleLabels[invite.role]} with ${invite.email}. Choose a password to finish.`
          : `Choose a new password for ${invite.email}. You will be signed out everywhere else.`}
      </p>
      <AcceptInviteForm token={token} kind={invite.kind} name={invite.name} />
    </>
  );
}
