import { PartnerCard } from "@/components/site/cards";
import { Reveal } from "@/components/site/reveal";
import { EmptyState, PageHero } from "@/components/site/section";
import { Tilt } from "@/components/site/tilt";
import { getPartners, getWorkList } from "@/lib/data";
import { buildMetadata, breadcrumbLd, JsonLd } from "@/lib/seo";

const description =
  "The sponsors, partners and collaborators who work with Fusion Esports, and the projects we have delivered together.";

export const metadata = buildMetadata({
  title: "Partners",
  description,
  path: "/partners",
});

export default async function PartnersPage() {
  const [partners, work] = await Promise.all([getPartners(), getWorkList()]);
  const ordered = [
    ...partners.filter((partner) => partner.featured),
    ...partners.filter((partner) => !partner.featured),
  ];

  return (
    <>
      <PageHero eyebrow="Partners" title="Built together" intro={description} />
      <div className="container-page py-14 sm:py-20">
        {ordered.length ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ordered.map((partner, index) => (
              <li key={partner.id}>
                <Reveal delay={(index % 3) * 0.06}>
                  <Tilt max={5}>
                    <PartnerCard
                      partner={partner}
                      projects={work
                        .filter((item) => item.partnerId === partner.id)
                        .map(({ id, title, slug }) => ({ id, title, slug }))}
                    />
                  </Tilt>
                </Reveal>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>Partner announcements are coming soon.</EmptyState>
        )}
      </div>
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Partners", path: "/partners" },
        ])}
      />
    </>
  );
}
