import { ContactForm } from "@/components/site/contact-form";
import { PageHero } from "@/components/site/section";
import {
  ContactIcon,
  contactDetails,
  socialLinks,
  SocialIcons,
} from "@/components/site/social-links";
import { getSettings, getSocials } from "@/lib/data";
import { breadcrumbLd, buildMetadata, JsonLd } from "@/lib/seo";

const description =
  "Contact Fusion Esports about partnerships, events, production, broadcast and apparel.";

export const metadata = buildMetadata({
  title: "Contact",
  description,
  path: "/contact",
});

export default async function ContactPage() {
  const [settings, socialRows] = await Promise.all([getSettings(), getSocials()]);
  const details = contactDetails(settings);
  const socials = socialLinks(socialRows);

  return (
    <>
      <PageHero eyebrow="Contact" title="Get in touch" intro={description} />
      <div className="container-page grid gap-12 py-14 sm:py-20 lg:grid-cols-[1fr_20rem]">
        <ContactForm />
        {(details.length > 0 || socials.length > 0) && (
          <aside className="space-y-6 rounded-lg border border-line bg-mist p-7">
            {details.length > 0 && (
              <ul className="space-y-6">
                {details.map(({ icon, label, value, href }) => (
                  <li key={label} className="flex gap-4">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
                      <ContactIcon icon={icon} className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                        {label}
                      </p>
                      {href ? (
                        <a
                          href={href}
                          className="mt-1 block break-words font-medium hover:text-brand"
                          {...(href.startsWith("http") && {
                            target: "_blank",
                            rel: "noopener noreferrer",
                          })}
                        >
                          {value}
                        </a>
                      ) : (
                        <p className="mt-1 whitespace-pre-line font-medium">{value}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {socials.length > 0 && (
              <div className={details.length ? "border-t border-line pt-6" : undefined}>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                  Follow us
                </p>
                <SocialIcons socials={socials} tone="light" className="mt-3" />
              </div>
            )}
          </aside>
        )}
      </div>
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact" },
        ])}
      />
    </>
  );
}
