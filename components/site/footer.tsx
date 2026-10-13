import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { getLinks, getSettings, getSocials } from "@/lib/data";
import { navLinks } from "@/lib/site";
import { Logo } from "./logo";
import { ContactIcon, contactDetails, socialLinks, SocialIcons } from "./social-links";

export async function Footer() {
  "use cache";
  cacheLife("hours");
  cacheTag("settings", "links", "socials");
  const [settings, links, socialRows] = await Promise.all([
    getSettings(),
    getLinks(),
    getSocials(),
  ]);
  const socials = socialLinks(socialRows);
  const contacts = contactDetails(settings);
  const resources = links.filter(
    (link) => link.category === "resource" || link.category === "partner",
  );

  return (
    <footer className="mt-auto bg-ink text-white">
      <div className="container-page grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.2fr_1fr]">
        <div>
          <Logo name={settings.siteName} />
          <p className="mt-5 max-w-sm leading-relaxed text-white/60">
            {settings.description}
          </p>
          {socials.length > 0 && (
            <div className="mt-7">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                Follow us
              </h2>
              <SocialIcons socials={socials} className="mt-4" />
            </div>
          )}
        </div>
        <nav aria-label="Footer">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
            Explore
          </h2>
          <ul className="mt-4 space-y-2.5">
            {[...navLinks, { href: "/contact", label: "Contact" }].map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-white/80 hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
            Contact
          </h2>
          <address className="mt-4 space-y-3.5 not-italic text-white/80">
            {contacts.map(({ label, value, href, icon }) => (
              <p key={label} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-white/5 text-brand">
                  <ContactIcon icon={icon} className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="sr-only">{label}: </span>
                  {href ? (
                    <a
                      href={href}
                      className="break-words hover:text-white"
                      {...(href.startsWith("http") && {
                        target: "_blank",
                        rel: "noopener noreferrer",
                      })}
                    >
                      {value}
                    </a>
                  ) : (
                    <span className="whitespace-pre-line">{value}</span>
                  )}
                </span>
              </p>
            ))}
            {contacts.length === 0 && (
              <p>
                <Link href="/contact" className="hover:text-white">
                  Send us a message
                </Link>
              </p>
            )}
          </address>
        </div>
        {resources.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
              Links
            </h2>
            <ul className="mt-4 space-y-2.5">
              {resources.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/80 hover:text-white"
                  >
                    {link.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="border-t border-white/10">
        <p className="container-page py-6 text-sm text-white/50">
          © {new Date().getFullYear()} {settings.siteName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
