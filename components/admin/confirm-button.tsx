"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";

/** Submit button that asks before running a destructive form action. */
export function ConfirmButton({
  message,
  ...props
}: ComponentProps<typeof Button> & { message: string }) {
  return (
    <Button
      type="submit"
      variant="danger"
      size="sm"
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
      {...props}
    />
  );
}
