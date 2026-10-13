import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ServiceCard } from "@/components/site/cards";
import { Spotlight } from "@/components/site/effects";
import { PageHero } from "@/components/site/section";
import { Button } from "@/components/ui/button";
import { getServices } from "@/lib/data";
import { absoluteUrl, breadcrumbLd, buildMetadata, JsonLd } from "@/lib/seo";
import { defaultServices } from "@/lib/site";

const description =
  "What Fusion Esports offers: competitive teams, tournament production, content, creative and brand partnerships.";

export const metadata = buildMetadata({
  title: "Services",
  description,
  path: "/services",
});

export default async function ServicesPage() {
  const services = await getServices();
  const list = services.length ? services : defaultServices;
  return (
    <>
      <PageHero eyebrow="Services" title="What we do" intro={description} />
      <div className="container-page py-14 sm:py-20">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((service) => (
            <li key={service.title}>
              <Spotlight>
                <ServiceCard service={service} />
              </Spotlight>
            </li>
          ))}
        </ul>
        <div className="mt-14 flex flex-col items-start justify-between gap-6 rounded-lg bg-ink p-8 text-white sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="heading-display text-3xl sm:text-4xl">
              Have a project in mind?
            </h2>
            <p className="mt-2 text-white/70">
              Tell us what you need and we will come back with a plan.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/contact">
              Start a conversation <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Services", path: "/services" },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: list.map((service, index) => ({
            "@type": "ListItem",
            position: index + 1,
            item: {
              "@type": "Service",
              name: service.title,
              description: service.description,
              provider: { "@id": absoluteUrl("/#organization") },
            },
          })),
        }}
      />
    </>
  );
}
