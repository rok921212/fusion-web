import {
  Globe,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  type LucideIcon,
} from "lucide-react";

// Draws one social-link icon. Safe for both server and client components: it
// receives already-resolved data (a brand's SVG path, a generic icon name or
// an uploaded image), never the whole icon catalog.

export type IconData =
  | { kind: "brand"; path: string; title?: string }
  | { kind: "generic"; name: string; title?: string }
  | { kind: "image"; src: string; title?: string };

const generic: Record<string, LucideIcon> = {
  globe: Globe,
  mail: Mail,
  phone: Phone,
  message: MessageCircle,
  link: Link2,
  map: MapPin,
};

export function IconGlyph({ icon, className }: { icon: IconData | null; className?: string }) {
  if (icon?.kind === "brand") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
        <path d={icon.path} />
      </svg>
    );
  }
  if (icon?.kind === "image") {
    // Uploaded PNG icons keep their own colours.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={icon.src} alt="" aria-hidden="true" className={`${className ?? ""} object-contain`} />;
  }
  const Icon = (icon?.kind === "generic" && generic[icon.name]) || Link2;
  return <Icon className={className} aria-hidden="true" />;
}
