import type { Metadata } from "next";
import Image from "next/image";
import { NumberTicker } from "@/components/site/effects";
import { Markdown } from "@/components/site/markdown";
import { PageHero } from "@/components/site/section";
import { getPartners, getSettings } from "@/lib/data";
import { breadcrumbLd, buildMetadata, JsonLd } from "@/lib/seo";
import { parseStats } from "@/lib/site";
import { isAllowedImageUrl } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return buildMetadata({
    title: "About",
    description: `About ${settings.siteName}. ${settings.description}`,
    path: "/about",
  });
}

export default async function AboutPage() {
  const [settings, partners] = await Promise.all([getSettings(), getPartners()]);
  const stats = parseStats(settings.stats);

  return (
    <>
      <PageHero
        eyebrow="About"
        title={`About ${settings.siteName}`}
        intro={settings.tagline}
      />
      <div className="container-page grid gap-12 py-14 sm:py-20 lg:grid-cols-[1fr_20rem]">
        <Markdown>{settings.about}</Markdown>
        {stats.length > 0 && (
          <aside>
            <dl className="space-y-6 rounded-lg bg-ink p-8 text-white">
              {stats.map((stat) => (
                <div key={stat.label} className="border-l-2 border-brand pl-5">
                  <dd className="heading-display text-5xl">
                    <NumberTicker value={stat.value} />
                  </dd>
                  <dt className="mt-1 text-sm uppercase tracking-widest text-white/60">
                    {stat.label}
                  </dt>
                </div>
              ))}
            </dl>
          </aside>
        )}
      </div>

      {partners.length > 0 && (
        <section className="border-t border-line bg-mist py-16">
          <div className="container-page">
            <p className="eyebrow">Partners</p>
            <h2 className="heading-display mt-3 text-4xl sm:text-5xl">
              Who we work with
            </h2>
            <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {partners.map((partner) => {
                const content =
                  partner.logo && isAllowedImageUrl(partner.logo) ? (
                    <Image
                      src={partner.logo}
                      alt={partner.name}
                      width={140}
                      height={48}
                      className="h-10 w-auto object-contain"
                    />
                  ) : (
                    <span className="heading-display text-xl">{partner.name}</span>
                  );
                const box =
                  "flex h-24 items-center justify-center rounded-lg border border-line bg-white px-5 text-center";
                return (
                  <li key={partner.id}>
                    {partner.url ? (
                      <a
                        href={partner.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${box} transition-colors hover:border-brand`}
                      >
                        {content}
                      </a>
                    ) : (
                      <div className={box}>{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ])}
      />
    </>
  );
}
