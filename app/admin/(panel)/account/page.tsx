import { LogOut } from "lucide-react";
import { ChangePasswordForm, ProfileForm } from "@/components/admin/auth-forms";
import { Notice, PageHeader, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { signOutOtherDevices } from "@/lib/actions/auth";
import { requireAdmin } from "@/lib/dal";
import { roleDescriptions, roleLabels } from "@/lib/permissions";

// Checks the session on the server on every request; see app/admin/layout.tsx.
export const instant = false;

export const metadata = { title: "My account" };

export default async function AccountPage({ searchParams }: PageProps<"/admin/account">) {
  const admin = await requireAdmin();
  const query = await searchParams;
  return (
    <>
      <PageHeader
        title="My account"
        description={`${admin.email} · ${roleLabels[admin.role]}. ${roleDescriptions[admin.role]}`}
      />
      {query.signedOut && <Notice>Your other devices have been signed out.</Notice>}
      {!admin.username && (
        <Notice>Choose a username below so you can sign in with it instead of your email.</Notice>
      )}
      <div className="space-y-6">
        <Panel title="Profile">
          <div className="p-5">
            <ProfileForm name={admin.name} username={admin.username} />
          </div>
        </Panel>
        <Panel title="Password">
          <div className="p-5">
            <ChangePasswordForm />
          </div>
        </Panel>
        <Panel title="Sessions">
          <div className="flex flex-wrap items-center justify-between gap-4 p-5">
            <p className="max-w-lg text-sm text-muted">
              Signed in on a shared or lost device? Sign out everywhere except here.
            </p>
            <form action={signOutOtherDevices}>
              <Button type="submit" variant="outline">
                <LogOut /> Sign out other devices
              </Button>
            </form>
          </div>
        </Panel>
      </div>
    </>
  );
}
