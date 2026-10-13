"use client";

import { CheckCircle2 } from "lucide-react";
import { useFormAction } from "@/components/ui/use-form-action";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/form";
import { sendMessage } from "@/lib/actions/contact";

export function ContactForm() {
  const [state, onSubmit, pending] = useFormAction(sendMessage, undefined);

  if (state?.ok) {
    return (
      <div
        role="status"
        className="rounded-lg border border-line bg-mist p-8 text-center"
      >
        <CheckCircle2 className="mx-auto size-10 text-brand" aria-hidden="true" />
        <h2 className="heading-display mt-4 text-3xl">Message sent</h2>
        <p className="mt-2 text-muted">
          Thank you. We will get back to you as soon as we can.
        </p>
      </div>
    );
  }

  const errors = state?.errors ?? {};
  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            required
            aria-invalid={!!errors.name}
            aria-describedby="name-error"
          />
          <FieldError id="name-error" message={errors.name} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={!!errors.email}
            aria-describedby="email-error"
          />
          <FieldError id="email-error" message={errors.email} />
        </div>
      </div>
      <div>
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" name="subject" />
      </div>
      {/* Honeypot: hidden from people, filled in by bots. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" tabIndex={-1} autoComplete="off" />
      </div>
      <div>
        <Label htmlFor="body">Message</Label>
        <Textarea
          id="body"
          name="body"
          rows={7}
          required
          aria-invalid={!!errors.body}
          aria-describedby="body-error"
        />
        <FieldError id="body-error" message={errors.body} />
      </div>
      {state?.message && (
        <p role="alert" className="text-sm text-brand">
          {state.message}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
