"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/form";
import { useFormAction } from "@/components/ui/use-form-action";
import {
  acceptInvitation,
  changePassword,
  login,
  registerWithCode,
  updateProfile,
  type AuthState,
} from "@/lib/actions/auth";

function PasswordInput(props: ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className="pr-11" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-muted hover:text-ink"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function TextField({
  name,
  label,
  errors,
  ...props
}: { name: string; label: string; errors: Record<string, string> } & ComponentProps<
  typeof Input
>) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        aria-invalid={!!errors[name]}
        aria-describedby={`${name}-error`}
        {...props}
      />
      <FieldError id={`${name}-error`} message={errors[name]} />
    </div>
  );
}

function PasswordField({
  name,
  label,
  errors,
  autoComplete,
  help,
}: {
  name: string;
  label: string;
  errors: Record<string, string>;
  autoComplete: string;
  help?: string;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <PasswordInput
        id={name}
        name={name}
        autoComplete={autoComplete}
        required
        aria-invalid={!!errors[name]}
        aria-describedby={`${name}-error ${name}-help`}
      />
      {help && (
        <p id={`${name}-help`} className="mt-1.5 text-xs text-muted">
          {help}
        </p>
      )}
      <FieldError id={`${name}-error`} message={errors[name]} />
    </div>
  );
}

export function UsernameField({
  errors,
  defaultValue,
}: {
  errors: Record<string, string>;
  defaultValue?: string;
}) {
  return (
    <div>
      <Label htmlFor="username">Username</Label>
      <Input
        id="username"
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        defaultValue={defaultValue}
        required
        aria-invalid={!!errors.username}
        aria-describedby="username-error username-help"
      />
      <p id="username-help" className="mt-1.5 text-xs text-muted">
        Used to sign in. 3–32 lowercase letters, numbers, dots, dashes or underscores.
      </p>
      <FieldError id="username-error" message={errors.username} />
    </div>
  );
}

const PASSWORD_HELP =
  "At least 10 characters, mixing three of: lowercase, uppercase, numbers, symbols.";

export function NewPasswordFields({ errors }: { errors: Record<string, string> }) {
  return (
    <>
      <PasswordField
        name="password"
        label="Password"
        errors={errors}
        autoComplete="new-password"
        help={PASSWORD_HELP}
      />
      <PasswordField
        name="confirm"
        label="Confirm password"
        errors={errors}
        autoComplete="new-password"
      />
    </>
  );
}

function Status({ state }: { state: AuthState }) {
  if (state?.error) {
    return (
      <p role="alert" className="rounded-md bg-brand-soft px-3 py-2 text-sm text-brand">
        {state.error}
      </p>
    );
  }
  if (state?.ok && state.message) {
    return (
      <p role="status" className="text-sm font-medium text-green-700">
        {state.message}
      </p>
    );
  }
  return null;
}

export function LoginForm() {
  const [state, onSubmit, pending] = useFormAction(login, undefined);
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <TextField
        name="login"
        label="Username or email"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        errors={{}}
      />
      <PasswordField
        name="password"
        label="Password"
        errors={{}}
        autoComplete="current-password"
      />
      <Status state={state} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export function RegisterForm({ first }: { first: boolean }) {
  const [state, onSubmit, pending] = useFormAction(registerWithCode, undefined);
  const errors = state?.errors ?? {};
  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <PasswordField
        name="code"
        label="Access code"
        errors={errors}
        autoComplete="off"
        help="The admin access code from the website owner."
      />
      <TextField name="name" label="Your name" autoComplete="name" errors={errors} />
      <UsernameField errors={errors} />
      <TextField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        errors={errors}
      />
      <NewPasswordFields errors={errors} />
      <Status state={state} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : first ? "Create super admin account" : "Create account"}
      </Button>
    </form>
  );
}

export function AcceptInviteForm({
  token,
  kind,
  name,
}: {
  token: string;
  kind: "invite" | "reset";
  name: string;
}) {
  const [state, onSubmit, pending] = useFormAction(
    acceptInvitation.bind(null, token),
    undefined,
  );
  const errors = state?.errors ?? {};
  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {kind === "invite" && (
        <>
          <TextField
            name="name"
            label="Your name"
            autoComplete="name"
            defaultValue={name}
            errors={errors}
          />
          <UsernameField errors={errors} />
        </>
      )}
      <NewPasswordFields errors={errors} />
      <Status state={state} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Saving…" : kind === "invite" ? "Create my account" : "Set new password"}
      </Button>
    </form>
  );
}

export function ProfileForm({ name, username }: { name: string; username: string | null }) {
  const [state, onSubmit, pending] = useFormAction(updateProfile, undefined);
  const errors = state?.errors ?? {};
  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-5" noValidate>
      <TextField
        name="name"
        label="Name"
        autoComplete="name"
        defaultValue={name}
        errors={errors}
      />
      <UsernameField errors={errors} defaultValue={username ?? ""} />
      <Status state={state} />
      <Button type="submit" variant="dark" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, onSubmit, pending] = useFormAction(changePassword, undefined);
  const errors = state?.errors ?? {};
  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-5" noValidate>
      <PasswordField
        name="current"
        label="Current password"
        errors={errors}
        autoComplete="current-password"
      />
      <NewPasswordFields errors={errors} />
      <Status state={state} />
      <Button type="submit" variant="dark" disabled={pending}>
        {pending ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}
