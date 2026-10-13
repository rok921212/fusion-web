"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import * as z from "zod";
import { audit } from "@/lib/audit";
import {
  createSession,
  deleteSession,
  getCurrentAdmin,
  hashToken,
  requestDb,
  requireAdmin,
  revokeSessions,
} from "@/lib/dal";
import { getDb } from "@/lib/db";
import { C, type AdminDoc, type InvitationDoc } from "@/lib/db/schema";
import { getSecuritySettings } from "@/lib/security";
import { clientIp } from "@/lib/request";
import {
  clearAttempts,
  isLimited,
  progressiveDelay,
  recordAttempt,
} from "@/lib/rate-limit";
import { passwordProblem } from "@/lib/validation";

export type AuthState =
  | { error?: string; ok?: boolean; message?: string; errors?: Record<string, string> }
  | undefined;

const BCRYPT_COST = 12;
const WINDOW_MS = 15 * 60 * 1000;
// Compared against when the email is unknown, so every failure costs the same.
const DUMMY_HASH = "$2b$12$SpfJd7orfuc9lsy2NwAUQu0sfR4PRVO3b6Ol5QwzHQPGMYCtfCAIe";

const emailSchema = z.email("Enter a valid email address.").max(200);
const nameSchema = z
  .string()
  .trim()
  .min(2, "Enter your name.")
  .max(80, "Use at most 80 characters.");

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

function checkNewPassword(
  formData: FormData,
  email: string,
  errors: Record<string, string>,
) {
  const password = field(formData, "password");
  const problem = passwordProblem(password, email);
  if (problem) errors.password = problem;
  if (password !== field(formData, "confirm")) {
    errors.confirm = "The passwords do not match.";
  }
  return password;
}

function sameSecret(given: string, expected: string) {
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const ip = await clientIp();
  const email = field(formData, "email").trim().toLowerCase().slice(0, 200);
  const ipKey = `login:ip:${ip}`;
  const emailKey = `login:email:${email}`;

  if (
    (await isLimited(ipKey, 10, WINDOW_MS)) ||
    (await isLimited(emailKey, 5, WINDOW_MS))
  ) {
    return { error: "Too many attempts. Try again in 15 minutes." };
  }
  await progressiveDelay(ipKey);

  const db = await getDb();
  const admin = email
    ? await db.collection<AdminDoc>(C.admins).findOne({ email })
    : null;
  // Always run the comparison so an unknown email takes as long as a wrong
  // password, and give the same message for both.
  const passwordOk = await bcrypt.compare(
    field(formData, "password").slice(0, 200),
    admin?.passwordHash ?? DUMMY_HASH,
  );
  if (!admin || !passwordOk || !admin.active) {
    await recordAttempt(ipKey, emailKey);
    await audit(null, "auth.login_failed", { type: "admin", label: email });
    return { error: "Incorrect email or password." };
  }

  await clearAttempts(emailKey);
  await db
    .collection(C.admins)
    .updateOne({ _id: admin._id }, { $set: { lastLoginAt: new Date() } });
  await createSession(admin._id);
  await audit({ id: admin._id.toString(), email }, "auth.login", {
    type: "admin",
    id: admin._id.toString(),
    label: email,
  });
  redirect("/admin");
}

export async function logout() {
  const admin = await getCurrentAdmin();
  await deleteSession();
  if (admin) await audit(admin, "auth.logout", { type: "admin", id: admin.id });
  redirect("/admin/login");
}

/**
 * Creates an account with the access code (ADMIN_INVITE_SECRET). The very
 * first account becomes the super admin; later ones get the role configured
 * under Security, if code sign-up is still enabled.
 */
export async function registerWithCode(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const secret = process.env.ADMIN_INVITE_SECRET;
  if (!secret) return { error: "Sign-up with an access code is not configured." };

  const ip = await clientIp();
  const key = `register:ip:${ip}`;
  if (await isLimited(key, 5, 60 * 60 * 1000)) {
    return { error: "Too many attempts. Try again in an hour." };
  }

  const db = await getDb();
  const admins = db.collection<AdminDoc>(C.admins);
  const isFirst = (await admins.estimatedDocumentCount()) === 0;
  const security = await getSecuritySettings();
  if (!isFirst && !security.codeSignup) {
    return { error: "Sign-up with an access code is turned off. Ask a super admin for an invitation." };
  }

  if (!sameSecret(field(formData, "code"), secret)) {
    await recordAttempt(key);
    await audit(null, "auth.register_bad_code");
    return { errors: { code: "This access code is not valid." } };
  }

  const errors: Record<string, string> = {};
  const name = nameSchema.safeParse(field(formData, "name"));
  if (!name.success) errors.name = name.error.issues[0].message;
  const email = emailSchema.safeParse(field(formData, "email").trim().toLowerCase());
  if (!email.success) errors.email = email.error.issues[0].message;
  const password = checkNewPassword(formData, email.data ?? "", errors);
  if (!name.success || !email.success || Object.keys(errors).length) {
    return { errors };
  }

  // Only one request can claim the bootstrap marker, so two simultaneous
  // first sign-ups cannot both become super admin.
  let role = security.codeSignupRole;
  if (isFirst) {
    const claimed = await db
      .collection<{ _id: string }>(C.settings)
      .insertOne({ _id: "bootstrap" })
      .then(() => true)
      .catch(() => false);
    if (claimed) role = "super_admin";
  }

  const now = new Date();
  let id: ObjectId;
  try {
    ({ insertedId: id } = await admins.insertOne({
      _id: new ObjectId(),
      name: name.data,
      email: email.data,
      passwordHash: await bcrypt.hash(password, BCRYPT_COST),
      role,
      active: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    }));
  } catch {
    return { errors: { email: "An account with this email already exists. Sign in instead." } };
  }

  await clearAttempts(key);
  await createSession(id);
  await audit({ id: id.toString(), email: email.data }, "admin.register_with_code", {
    type: "admin",
    id: id.toString(),
    label: email.data,
  }, { role });
  redirect("/admin");
}

async function findUsableInvitation(token: string) {
  if (!token || token.length > 128) return null;
  const db = await requestDb();
  return db.collection<InvitationDoc>(C.invitations).findOne({
    tokenHash: hashToken(token),
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });
}

export async function getInvitation(token: string) {
  const invite = await findUsableInvitation(token);
  return invite
    ? { kind: invite.kind, email: invite.email, name: invite.name, role: invite.role }
    : null;
}

/** Accepts an invitation (new account) or a password-reset link. */
export async function acceptInvitation(
  token: string,
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const ip = await clientIp();
  const key = `invite:ip:${ip}`;
  if (await isLimited(key, 10, WINDOW_MS)) {
    return { error: "Too many attempts. Try again in 15 minutes." };
  }

  const invite = await findUsableInvitation(token);
  if (!invite) {
    await recordAttempt(key);
    return { error: "This link is invalid, expired or already used." };
  }

  const errors: Record<string, string> = {};
  const name = nameSchema.safeParse(field(formData, "name") || invite.name);
  if (invite.kind === "invite" && !name.success) {
    errors.name = name.error.issues[0].message;
  }
  const password = checkNewPassword(formData, invite.email, errors);
  if (Object.keys(errors).length) return { errors };

  const db = await getDb();
  // Mark the token used first: if two requests race, only one gets it.
  const claimed = await db
    .collection<InvitationDoc>(C.invitations)
    .findOneAndUpdate(
      { _id: invite._id, usedAt: null },
      { $set: { usedAt: new Date() } },
    );
  if (!claimed) return { error: "This link has already been used." };

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const now = new Date();
  const admins = db.collection<AdminDoc>(C.admins);
  let adminId: ObjectId;

  if (invite.kind === "reset" && invite.adminId) {
    const result = await admins.updateOne(
      { _id: invite.adminId },
      { $set: { passwordHash, updatedAt: now } },
    );
    if (!result.matchedCount) return { error: "This account no longer exists." };
    adminId = invite.adminId;
    await revokeSessions(adminId);
    await audit({ id: adminId.toString(), email: invite.email }, "admin.password_reset", {
      type: "admin",
      id: adminId.toString(),
      label: invite.email,
    });
  } else {
    try {
      ({ insertedId: adminId } = await admins.insertOne({
        _id: new ObjectId(),
        name: name.data ?? invite.name,
        email: invite.email,
        passwordHash,
        role: invite.role,
        active: true,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      }));
    } catch {
      return { error: "An account with this email already exists. Sign in instead." };
    }
    await audit(
      { id: adminId.toString(), email: invite.email },
      "admin.invitation_accepted",
      { type: "admin", id: adminId.toString(), label: invite.email },
      { role: invite.role },
    );
  }

  await createSession(adminId);
  redirect("/admin");
}

export async function updateProfile(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const admin = await requireAdmin();
  const name = nameSchema.safeParse(field(formData, "name"));
  if (!name.success) return { errors: { name: name.error.issues[0].message } };

  const db = await getDb();
  await db
    .collection(C.admins)
    .updateOne(
      { _id: new ObjectId(admin.id) },
      { $set: { name: name.data, updatedAt: new Date() } },
    );
  return { ok: true, message: "Profile saved." };
}

export async function changePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const admin = await requireAdmin();
  const key = `password:${admin.id}`;
  if (await isLimited(key, 5, WINDOW_MS)) {
    return { error: "Too many attempts. Try again in 15 minutes." };
  }

  const db = await getDb();
  const account = await db
    .collection<AdminDoc>(C.admins)
    .findOne({ _id: new ObjectId(admin.id) });
  if (!account) redirect("/admin/login");

  const errors: Record<string, string> = {};
  if (!(await bcrypt.compare(field(formData, "current").slice(0, 200), account.passwordHash))) {
    await recordAttempt(key);
    errors.current = "The current password is not correct.";
  }
  const password = checkNewPassword(formData, account.email, errors);
  if (Object.keys(errors).length) return { errors };

  await db.collection(C.admins).updateOne(
    { _id: account._id },
    { $set: { passwordHash: await bcrypt.hash(password, BCRYPT_COST), updatedAt: new Date() } },
  );
  // Every other device is signed out; this one gets a fresh session.
  await revokeSessions(account._id);
  await createSession(account._id);
  await audit(admin, "admin.password_changed", { type: "admin", id: admin.id });
  return { ok: true, message: "Password changed. Other devices have been signed out." };
}

export async function signOutOtherDevices() {
  const admin = await requireAdmin();
  await revokeSessions(new ObjectId(admin.id), admin.sessionId);
  await audit(admin, "admin.sessions_revoked", { type: "admin", id: admin.id }, { self: true });
  redirect("/admin/account?signedOut=1");
}
