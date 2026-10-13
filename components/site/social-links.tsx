import { iconForUrl, resolveIcon, type ResolvedIcon } from "@/lib/brand-icons";
import type { SocialLink } from "@/lib/db/schema";
import type { SiteSettings } from "@/lib/site";
import { cn, isAllowedImageUrl } from "@/lib/utils";
import { isHttpUrl } from "@/lib/validation";
import { IconGlyph, type IconData } from "./icon-glyph";

// Server-side helpers that turn Social Links (managed in /admin/socials) and
// the contact details from Settings into ready-to-draw icons. Only the icons
// in use reach the page, never the whole catalog.

export type Social = { label: string; href: string; icon: IconData | null };

function toIconData(icon: ResolvedIcon | null): IconData | null {
  if (!icon) return null;
  return icon.kind === "brand"
    ? { kind: "brand", path: icon.path, title: icon.title }
    : { kind: "generic", name: icon.name, title: icon.title };
}

/** Uploaded PNG first, then the chosen icon, then one guessed from the URL. */
export function socialLinks(socials: SocialLink[]): Social[] {
  return socials.map((social) => ({
    label: social.name,
    href: social.url,
    icon:
      social.iconImage && isAllowedImageUrl(social.iconImage)
        ? { kind: "image", src: social.iconImage }
        : toIconData((social.icon && resolveIcon(social.icon)) || iconForUrl(social.url)),
  }));
}

/** A WhatsApp number becomes a wa.me link; a link is used as it is. */
export function whatsappHref(value: string) {
  if (!value) return "";
  if (isHttpUrl(value)) return value;
  const digits = value.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

/** Round icon buttons, for example in the footer. */
export function SocialIcons({
  socials,
  tone = "dark",
  className,
}: {
  socials: Social[];
  tone?: "dark" | "light";
  className?: string;
}) {
  if (!socials.length) return null;
  return (
    <ul className={cn("flex flex-wrap gap-2.5", className)}>
      {socials.map((social) => (
        <li key={social.href}>
          <a
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={social.label}
            title={social.label}
            className={cn(
              "inline-flex size-11 items-center justify-center rounded-full border transition hover:-translate-y-0.5 hover:border-brand hover:bg-brand hover:text-white hover:shadow-[0_0_20px_rgba(217,4,41,0.45)] motion-reduce:hover:translate-y-0",
              tone === "dark"
                ? "border-white/15 bg-white/5 text-white/80"
                : "border-line bg-white text-ink-soft",
            )}
          >
            <IconGlyph icon={social.icon} className="size-[18px]" />
          </a>
        </li>
      ))}
    </ul>
  );
}

type Contact = { label: string; value: string; href: string; icon: IconData };

/** Email, phone, WhatsApp and address from Settings. */
export function contactDetails(settings: SiteSettings): Contact[] {
  const whatsapp = toIconData(resolveIcon("si:whatsapp"))!;
  const details: Contact[] = [
    {
      label: "Email",
      value: settings.email,
      href: settings.email && `mailto:${settings.email}`,
      icon: { kind: "generic", name: "mail" },
    },
    {
      label: "Phone",
      value: settings.phone,
      href: settings.phone && `tel:${settings.phone.replace(/[^+\d]/g, "")}`,
      icon: { kind: "generic", name: "phone" },
    },
    {
      label: "WhatsApp",
      value: isHttpUrl(settings.whatsapp) ? "Message us" : settings.whatsapp,
      href: whatsappHref(settings.whatsapp),
      icon: whatsapp,
    },
    {
      label: "Address",
      value: settings.address,
      href: "",
      icon: { kind: "generic", name: "map" },
    },
  ];
  return details.filter((detail) => detail.value);
}

export function ContactIcon({ icon, className }: { icon: IconData; className?: string }) {
  return <IconGlyph icon={icon} className={className} />;
}
