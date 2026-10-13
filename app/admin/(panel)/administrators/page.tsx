import { LogOut, Trash2 } from "lucide-react";
import {
  CreateAdminForm,
  InviteForm,
  ResetLinkButton,
  SecurityForm,
} from "@/components/admin/admin-users";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Badge, Notice, PageHeader, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import {
  deleteAdmin,
  deleteInvitation,
  revokeAdminSessions,
  updateAdmin,
} from "@/lib/actions/users";
import { requestDb, requireAdmin } from "@/lib/dal";
import { C, type AdminDoc, type InvitationDoc } from "@/lib/db/schema";
import { roleLabels, roles } from "@/lib/permissions";
import { getSecuritySettings } from "@/lib/security";
import { formatDate } from "@/lib/utils";

// Checks the session on the server on every request; see app/admin/layout.tsx.
export const instant = false;

export const metadata = { title: "Administrators" };

const errors: Record<string, string> = {
  self: "You cannot change your own role or deactivate yourself. Ask another super admin.",
  last: "There must always be at least one active super admin.",
  deleteSelf: "You cannot delete your own account. Ask another super admin.",
};

export default async function AdministratorsPage({
  searchParams,
}: PageProps<"/admin/administrators">) {
  const me = await requireAdmin("admins.manage");
  const query = await searchParams;
  const db = await requestDb();
  const [admins, invitations, security, sessionCounts] = await Promise.all([
    db.collection<AdminDoc>(C.admins).find({}).sort({ createdAt: 1 }).toArray(),
    db
      .collection<InvitationDoc>(C.invitations)
      .find({ kind: "invite", usedAt: null, expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .toArray(),
    getSecuritySettings(),
    db
      .collection(C.sessions)
      .aggregate<{ _id: unknown; count: number }>([
        { $match: { expiresAt: { $gt: new Date() } } },
        { $group: { _id: "$adminId", count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);
  const sessions = new Map(sessionCounts.map((s) => [String(s._id), s.count]));

  return (
    <>
      <PageHeader
        title="Administrators"
        description="Invite people, set their role, deactivate accounts and sign them out. Role changes sign the person out so the new access applies at once."
      />
      {typeof query.error === "string" && errors[query.error] && (
        <Notice tone="error">{errors[query.error]}</Notice>
      )}
      {query.saved && <Notice>Administrator updated.</Notice>}
      {query.revoked && <Notice>Sessions revoked.</Notice>}
      {query.deleted && <Notice>Administrator deleted.</Notice>}

      <Panel title="Team">
        <ul className="divide-y divide-line">
          {admins.map((admin) => {
            const id = admin._id.toString();
            const isMe = id === me.id;
            return (
              <li key={id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {admin.name}
                    {isMe && <Badge tone="brand">You</Badge>}
                    {!admin.active && <Badge>Deactivated</Badge>}
                  </p>
                  <p className="truncate text-sm text-muted">
                    {admin.username ? `@${admin.username}` : "No username"} · {admin.email}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Last sign-in {admin.lastLoginAt ? formatDate(admin.lastLoginAt) : "never"} ·{" "}
                    {sessions.get(id) ?? 0} active session{sessions.get(id) === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  {isMe ? (
                    <Badge tone="green">{roleLabels[admin.role]}</Badge>
                  ) : (
                    <form action={updateAdmin.bind(null, id)} className="flex flex-wrap items-center gap-2">
                      <Select
                        name="role"
                        defaultValue={admin.role}
                        aria-label={`Role for ${admin.email}`}
                        className="h-9 w-40"
                      >
                        {roles.map((role) => (
                          <option key={role} value={role}>
                            {roleLabels[role]}
                          </option>
                        ))}
                      </Select>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="active"
                          defaultChecked={admin.active}
                          className="size-4 accent-brand"
                        />
                        Active
                      </label>
                      <Button type="submit" size="sm" variant="dark">
                        Save
                      </Button>
                    </form>
                  )}
                  {!isMe && <ResetLinkButton adminId={id} email={admin.email} />}
                  <form action={revokeAdminSessions.bind(null, id)}>
                    <Button
                      type="submit"
                      size="sm"
                      variant="outline"
                      aria-label={`Sign ${admin.email} out everywhere`}
                    >
                      <LogOut /> {isMe ? "Sign out other devices" : "Sign out"}
                    </Button>
                  </form>
                  {!isMe && (
                    <form action={deleteAdmin.bind(null, id)}>
                      <ConfirmButton
                        message={`Permanently delete ${admin.name} (${admin.email})${
                          admin.role === "super_admin" ? ", a super admin" : ""
                        }? This cannot be undone.`}
                        aria-label={`Delete ${admin.email}`}
                      >
                        <Trash2 /> Delete
                      </ConfirmButton>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title="Create an administrator" className="mt-6">
        <div className="p-5">
          <p className="mb-4 max-w-2xl text-sm text-muted">
            Set their username and password yourself. The account works straight away;
            share the details privately and ask them to change the password under My account.
          </p>
          <CreateAdminForm />
        </div>
      </Panel>

      <Panel title="Invite an administrator" className="mt-6">
        <div className="p-5">
          <p className="mb-4 max-w-2xl text-sm text-muted">
            Or send a one-time link so they choose their own username and password.
          </p>
          <InviteForm defaultDays={security.inviteDays} />
        </div>
      </Panel>

      {invitations.length > 0 && (
        <Panel title="Pending invitations" className="mt-6">
          <ul className="divide-y divide-line">
            {invitations.map((invite) => (
              <li key={invite._id.toString()} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {invite.name} · {invite.email}
                  </p>
                  <p className="text-xs text-muted">
                    {roleLabels[invite.role]} · expires {formatDate(invite.expiresAt)}
                  </p>
                </div>
                <form action={deleteInvitation.bind(null, invite._id.toString())}>
                  <ConfirmButton message={`Revoke the invitation for ${invite.email}?`} aria-label="Revoke invitation">
                    <Trash2 />
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Security" className="mt-6">
        <div className="p-5">
          <SecurityForm values={security} />
        </div>
      </Panel>
    </>
  );
}
