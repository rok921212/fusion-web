"use client";

import { Check, Copy, KeyRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select } from "@/components/ui/form";
import { useFormAction } from "@/components/ui/use-form-action";
import {
  createInvitation,
  createResetLink,
  saveSecuritySettings,
  type UserFormState,
} from "@/lib/actions/users";
import { roleDescriptions, roleLabels, roles, type Role } from "@/lib/permissions";

function OneTimeLink({ state }: { state: UserFormState }) {
  const [copied, setCopied] = useState(false);
  if (!state?.link) return null;
  return (
    <div role="status" className="rounded-md border border-green-200 bg-green-50 p-4 text-sm">
      <p className="font-medium text-green-800">{state.message}</p>
      <div className="mt-3 flex gap-2">
        <Input readOnly value={state.link} aria-label="One-time link" className="font-mono text-xs" />
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(state.link!).catch(() => {});
            setCopied(true);
          }}
        >
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-green-800/80">
        This link is shown only once. Send it privately, for example by direct message.
      </p>
    </div>
  );
}

export function InviteForm({ defaultDays }: { defaultDays: number }) {
  const [state, onSubmit, pending] = useFormAction(createInvitation, undefined);
  const errors = state?.errors ?? {};
  const [role, setRole] = useState<Role>("editor");

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="invite-name">Name</Label>
          <Input id="invite-name" name="name" aria-invalid={!!errors.name} />
          <FieldError id="invite-name-error" message={errors.name} />
        </div>
        <div>
          <Label htmlFor="invite-email">Email</Label>
          <Input id="invite-email" name="email" type="email" aria-invalid={!!errors.email} />
          <FieldError id="invite-email-error" message={errors.email} />
        </div>
        <div>
          <Label htmlFor="invite-role">Role</Label>
          <Select
            id="invite-role"
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
          >
            {roles.map((value) => (
              <option key={value} value={value}>
                {roleLabels[value]}
              </option>
            ))}
          </Select>
          <p className="mt-1.5 text-xs text-muted">{roleDescriptions[role]}</p>
        </div>
        <div>
          <Label htmlFor="invite-days">Link expires after (days)</Label>
          <Input
            id="invite-days"
            name="days"
            type="number"
            min={1}
            max={14}
            defaultValue={defaultDays}
            className="max-w-28"
            aria-invalid={!!errors.days}
          />
          <FieldError id="invite-days-error" message={errors.days} />
        </div>
      </div>
      <OneTimeLink state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create invitation link"}
      </Button>
    </form>
  );
}

export function ResetLinkButton({ adminId, email }: { adminId: string; email: string }) {
  const [state, onSubmit, pending] = useFormAction(
    () => createResetLink(adminId),
    undefined,
  );
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <Button type="submit" variant="outline" size="sm" disabled={pending} aria-label={`Create password reset link for ${email}`}>
        <KeyRound /> {pending ? "Creating…" : "Reset link"}
      </Button>
      <OneTimeLink state={state} />
      {state?.message && !state.link && <p className="text-xs text-brand">{state.message}</p>}
    </form>
  );
}

export function SecurityForm({
  values,
}: {
  values: { codeSignup: boolean; codeSignupRole: Role; inviteDays: number };
}) {
  const [state, onSubmit, pending] = useFormAction(saveSecuritySettings, undefined);
  const errors = state?.errors ?? {};
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <label className="flex items-start gap-3 text-sm font-medium">
        <input
          type="checkbox"
          name="codeSignup"
          defaultChecked={values.codeSignup}
          className="mt-0.5 size-4 accent-brand"
        />
        <span>
          Allow new accounts with the access code
          <span className="mt-0.5 block font-normal text-muted">
            Anyone with the code can create an account at /admin/register. Turn
            this off once your team is set up and use invitations instead.
          </span>
        </span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="codeSignupRole">Role for access-code accounts</Label>
          <Select id="codeSignupRole" name="codeSignupRole" defaultValue={values.codeSignupRole}>
            <option value="editor">{roleLabels.editor}</option>
            <option value="admin">{roleLabels.admin}</option>
          </Select>
          <FieldError id="codeSignupRole-error" message={errors.codeSignupRole} />
        </div>
        <div>
          <Label htmlFor="inviteDays">Default invitation lifetime (days)</Label>
          <Input
            id="inviteDays"
            name="inviteDays"
            type="number"
            min={1}
            max={14}
            defaultValue={values.inviteDays}
            className="max-w-28"
          />
          <FieldError id="inviteDays-error" message={errors.inviteDays} />
        </div>
      </div>
      <div className="max-w-sm">
        <Label htmlFor="security-current">Your current password</Label>
        <Input
          id="security-current"
          name="current"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.current}
        />
        <FieldError id="security-current-error" message={errors.current} />
      </div>
      {state?.ok && (
        <p role="status" className="text-sm font-medium text-green-700">
          {state.message}
        </p>
      )}
      <Button type="submit" variant="dark" disabled={pending}>
        {pending ? "Saving…" : "Save security settings"}
      </Button>
    </form>
  );
}
