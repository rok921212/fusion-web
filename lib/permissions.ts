// Role-based permissions. Checked on the server for every admin page, server
// action and route handler; the UI only uses them to hide what would fail.

export const roles = ["super_admin", "admin", "editor"] as const;
export type Role = (typeof roles)[number];

export const roleLabels: Record<Role, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  editor: "Content editor",
};

export const roleDescriptions: Record<Role, string> = {
  super_admin:
    "Everything, including administrators, security settings and the audit log.",
  admin:
    "All content, messages and website settings. Cannot manage administrators.",
  editor:
    "Create and edit content as drafts. Cannot publish, delete or change settings.",
};

export type Permission =
  | "content.edit"
  | "content.publish"
  | "content.delete"
  | "media.upload"
  | "media.delete"
  | "messages.read"
  | "settings.manage"
  | "admins.manage"
  | "audit.read";

const grants: Record<Role, readonly Permission[]> = {
  super_admin: [
    "content.edit",
    "content.publish",
    "content.delete",
    "media.upload",
    "media.delete",
    "messages.read",
    "settings.manage",
    "admins.manage",
    "audit.read",
  ],
  admin: [
    "content.edit",
    "content.publish",
    "content.delete",
    "media.upload",
    "media.delete",
    "messages.read",
    "settings.manage",
  ],
  editor: ["content.edit", "media.upload"],
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (roles as readonly string[]).includes(value);
}

export function can(role: Role, permission: Permission) {
  return grants[role]?.includes(permission) ?? false;
}

/** Roles an administrator with `actor` may hand out. */
export function assignableRoles(actor: Role): Role[] {
  return actor === "super_admin" ? [...roles] : [];
}
