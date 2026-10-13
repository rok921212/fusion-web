import Link from "next/link";
import type { ComponentProps } from "react";

/** next/link for paths on this site, a new-tab anchor for everything else. */
export function SmartLink({ href, ...props }: ComponentProps<"a"> & { href: string }) {
  if (href.startsWith("/")) return <Link href={href} {...props} />;
  return <a href={href} target="_blank" rel="noopener noreferrer" {...props} />;
}
