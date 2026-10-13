"use server";

import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import * as z from "zod";
import { audit } from "@/lib/audit";
import { hashToken, newToken, requireAdmin, revokeSessions } from "@/lib/dal";
import { getDb } from "@/lib/db";
import { C, type AdminDoc, type InvitationDoc } from "@/lib/db/schema";
import { isRole, type Role } from "@/lib/permissions";
import { siteUrl } from "@/lib/site";
import { OBJECT_ID } from "@/lib/validation";

export type UserFormState =
  | { errors?: Record<string, string>; message?: string; ok?: boolean; link?: string }
  | undefined;

const DAY = 86400 * 1000;

function toObjectId(id: string) {
  if (!OBJECT_ID.test(id)) redirect("/admin/administrators");
  return new ObjectId(id);
}

async function activeSuperAdmins(excluding?: ObjectId) {
  const db = await getDb();
  return db.collection<AdminDoc>(C.admins).countDocuments({
    role: "super_admin",
    active: true,
    ...(excluding ? { _id: { $ne: excluding } } : {}),
  });
}

async function issueLink(
  kind: InvitationDoc["kind"],
  values: { email: string; name: string; role: Role; adminId: ObjectId | null },
  createdBy: string,
  days: number,
) {
  const token = newToken();
  const now = new Date();
  const db = await getDb();
  await db.collection<InvitationDoc>(C.invitations).insertOne({
    _id: new ObjectId(),
    tokenHash: hashToken(token),
    kind,
    ...values,
    createdBy: new ObjectId(createdBy),
    createdAt: now,
    expiresAt: new Date(now.getTime() + days * DAY),
    usedAt: null,
  });
  return `${siteUrl}/admin/invite/${token}`;
}

const inviteSchema = z.object({
  name: z.string().trim().min(2, "Enter their name.").max(80),
  email: z.email("Enter a valid email address.").max(200),
  role: z.string().refine(isRole, "Choose a role."),
  days: z.coerce.number().int().min(1, "At least 1 day.").max(14, "At most 14 days."),
});

export async function createInvitation(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const actor = await requireAdmin("admins.manage");

  const parsed = inviteSchema.safeParse({
    name: formData.get("name"),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    role: formData.get("role"),
    days: formData.get("days"),
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
    return { errors };
  }
  const { name, email, role, days } = parsed.data;

  const db = await getDb();
  if (await db.collection(C.admins).findOne({ email })) {
    return { errors: { email: "An administrator with this email already exists." } };
  }

  const link = await issueLink("invite", { email, name, role: role as Role, adminId: null }, actor.id, days);
  await audit(actor, "admin.invited", { type: "invitation", label: email }, { role, days });
  return {
    ok: true,
    link,
    message: `Invitation created for ${email}. Send them this link; it works once and expires in ${days} day${days === 1 ? "" : "s"}.`,
  };
}

export async function createResetLink(adminId: string): Promise<UserFormState> {
  const actor = await requireAdmin("admins.manage");
  const db = await getDb();
  const target = await db
    .collection<AdminDoc>(C.admins)
    .findOne({ _id: toObjectId(adminId) });
  if (!target) return { message: "That administrator no longer exists." };

  const link = await issueLink(
    "reset",
    { email: target.email, name: target.name, role: target.role, adminId: target._id },
    actor.id,
    1,
  );
  await audit(actor, "admin.reset_link_created", {
    type: "admin",
    id: adminId,
    label: target.email,
  });
  return {
    ok: true,
    link,
    message: "Password reset link created. It works once and expires in 24 hours.",
  };
}

export async function updateAdmin(adminId: string, formData: FormData) {
  const actor = await requireAdmin("admins.manage");
  const id = toObjectId(adminId);
  if (adminId === actor.id) {
    redirect("/admin/administrators?error=self");
  }

  const db = await getDb();
  const target = await db.collection<AdminDoc>(C.admins).findOne({ _id: id });
  if (!target) redirect("/admin/administrators");

  const role = formData.get("role");
  const active = formData.get("active") === "on";
  if (!isRole(role)) redirect("/admin/administrators");

  const losesSuper =
    target.role === "super_admin" && target.active && (role !== "super_admin" || !active);
  if (losesSuper && (await activeSuperAdmins(id)) === 0) {
    redirect("/admin/administrators?error=last");
  }

  if (role === target.role && active === target.active) redirect("/admin/administrators");

  await db
    .collection(C.admins)
    .updateOne({ _id: id }, { $set: { role, active, updatedAt: new Date() } });
  // Privilege changes take effect on a fresh sign-in.
  await revokeSessions(id);
  await audit(actor, "admin.updated", { type: "admin", id: adminId, label: target.email }, {
    fromRole: target.role,
    toRole: role,
    active,
  });
  redirect("/admin/administrators?saved=1");
}

export async function revokeAdminSessions(adminId: string) {
  const actor = await requireAdmin("admins.manage");
  const id = toObjectId(adminId);
  const count = await revokeSessions(id, adminId === actor.id ? actor.sessionId : undefined);
  await audit(actor, "admin.sessions_revoked", { type: "admin", id: adminId }, { count });
  redirect("/admin/administrators?revoked=1");
}

export async function deleteInvitation(invitationId: string) {
  const actor = await requireAdmin("admins.manage");
  const db = await getDb();
  await db.collection(C.invitations).deleteOne({ _id: toObjectId(invitationId) });
  await audit(actor, "admin.invitation_revoked", { type: "invitation", id: invitationId });
  redirect("/admin/administrators");
}

export async function saveSecuritySettings(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const actor = await requireAdmin("admins.manage");

  // Security changes need the current password, even with a valid session.
  const db = await getDb();
  const account = await db
    .collection<AdminDoc>(C.admins)
    .findOne({ _id: new ObjectId(actor.id) });
  const current = String(formData.get("current") ?? "").slice(0, 200);
  if (!account || !(await bcrypt.compare(current, account.passwordHash))) {
    return { errors: { current: "Enter your current password to confirm." } };
  }

  const role = formData.get("codeSignupRole");
  const days = Number(formData.get("inviteDays"));
  if (!isRole(role) || role === "super_admin") {
    return { errors: { codeSignupRole: "Choose Admin or Content editor." } };
  }
  if (!Number.isInteger(days) || days < 1 || days > 14) {
    return { errors: { inviteDays: "Choose between 1 and 14 days." } };
  }
  const values = {
    codeSignup: formData.get("codeSignup") === "on",
    codeSignupRole: role,
    inviteDays: days,
  };
  await db
    .collection<{ _id: string }>(C.settings)
    .updateOne({ _id: "security" }, { $set: values }, { upsert: true });
  await audit(actor, "security.updated", { type: "settings", id: "security" }, values);
  return { ok: true, message: "Security settings saved." };
}
