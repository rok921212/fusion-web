import "server-only";
import { getDb } from "@/lib/db";
import { C } from "@/lib/db/schema";
import { isRole, type Role } from "@/lib/permissions";

export type SecuritySettings = {
  /** Whether new accounts can still be created with the access code. */
  codeSignup: boolean;
  /** Role given to accounts created with the access code. */
  codeSignupRole: Role;
  /** Days an invitation link stays valid by default. */
  inviteDays: number;
};

export const defaultSecurity: SecuritySettings = {
  codeSignup: true,
  codeSignupRole: "editor",
  inviteDays: 3,
};

export async function getSecuritySettings(): Promise<SecuritySettings> {
  const db = await getDb();
  const doc = await db
    .collection<{ _id: string } & Partial<SecuritySettings>>(C.settings)
    .findOne({ _id: "security" });
  return {
    codeSignup: doc?.codeSignup ?? defaultSecurity.codeSignup,
    codeSignupRole: isRole(doc?.codeSignupRole)
      ? doc.codeSignupRole
      : defaultSecurity.codeSignupRole,
    inviteDays: doc?.inviteDays ?? defaultSecurity.inviteDays,
  };
}
