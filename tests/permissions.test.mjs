import assert from "node:assert/strict";
import { test } from "node:test";
import { assignableRoles, can, isRole } from "../lib/permissions.ts";

test("super admins can do everything", () => {
  for (const permission of [
    "content.edit",
    "content.publish",
    "content.delete",
    "settings.manage",
    "admins.manage",
    "audit.read",
  ]) {
    assert.ok(can("super_admin", permission), permission);
  }
});

test("admins manage content and settings but not administrators", () => {
  assert.ok(can("admin", "content.publish"));
  assert.ok(can("admin", "settings.manage"));
  assert.equal(can("admin", "admins.manage"), false);
  assert.equal(can("admin", "audit.read"), false);
});

test("content editors only draft and upload", () => {
  assert.ok(can("editor", "content.edit"));
  assert.ok(can("editor", "media.upload"));
  for (const permission of [
    "content.publish",
    "content.delete",
    "media.delete",
    "messages.read",
    "settings.manage",
    "admins.manage",
    "audit.read",
  ]) {
    assert.equal(can("editor", permission), false, permission);
  }
});

test("unknown roles get nothing", () => {
  assert.equal(isRole("root"), false);
  assert.equal(isRole({ $ne: null }), false);
  assert.equal(can("root", "content.edit"), false);
});

test("only super admins can hand out roles", () => {
  assert.deepEqual(assignableRoles("admin"), []);
  assert.deepEqual(assignableRoles("editor"), []);
  assert.ok(assignableRoles("super_admin").includes("super_admin"));
});
