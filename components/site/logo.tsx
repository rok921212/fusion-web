import { cn } from "@/lib/utils";

/**
 * The Fusion wordmark (public/brand/fusion-logo.png). The artwork is a
 * single-colour shape, so it is drawn as a mask filled with the current text
 * colour: dark on light backgrounds, white on dark ones, set with a text-*
 * class on the component or a parent.
 */
export function Logo({
  name,
  label,
  className,
}: {
  /** Accessible name, usually the site name. */
  name: string;
  /** Optional tag shown after the wordmark, such as "Admin". */
  label?: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span
        role="img"
        aria-label={name}
        className="block h-8 aspect-[894/353] bg-current [mask:url(/brand/fusion-logo.png)_center/contain_no-repeat]"
      />
      {label && (
        <span className="rounded bg-brand px-1.5 py-0.5 text-[11px] font-semibold uppercase leading-none tracking-wider text-white">
          {label}
        </span>
      )}
    </span>
  );
}
