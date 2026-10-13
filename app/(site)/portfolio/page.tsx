import { PortfolioGrid } from "@/components/site/portfolio-grid";
import { EmptyState, PageHero } from "@/components/site/section";
import { getWorkList } from "@/lib/data";
import { buildMetadata, breadcrumbLd, JsonLd } from "@/lib/seo";

const description =
  "The Fusion Esports portfolio: tournaments, broadcasts and creative work delivered for players, partners and fans.";

export const metadata = buildMetadata({
  title: "Portfolio",
  description,
  path: "/portfolio",
});

export default async function PortfolioPage() {
  const items = await getWorkList();
  return (
    <>
      <PageHero eyebrow="Portfolio" title="Our work" intro={description} />
      <div className="container-page py-14 sm:py-20">
        {items.length ? (
          <PortfolioGrid items={items} />
        ) : (
          <EmptyState>Our portfolio is being prepared. Check back soon.</EmptyState>
        )}
      </div>
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Portfolio", path: "/portfolio" },
        ])}
      />
    </>
  );
}
