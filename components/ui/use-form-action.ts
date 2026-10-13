"use client";

import { startTransition, useActionState, type FormEvent } from "react";

/**
 * useActionState for forms that must keep what the user typed when the server
 * returns validation errors. (A form's `action` prop resets every field once
 * the action finishes; submitting through onSubmit does not.)
 */
export function useFormAction<State>(
  action: (state: Awaited<State>, formData: FormData) => State | Promise<State>,
  initialState: Awaited<State>,
) {
  const [state, dispatch, pending] = useActionState(action, initialState);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return [state, onSubmit, pending] as const;
}
