import { ArrowRight } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import {
  LiveLinkCard,
  NewsCard,
  ServiceCard,
  WorkCard,
} from "@/components/site/cards";
import { Marquee, NumberTicker, Spotlight } from "@/components/site/effects";
import { HeroRotator } from "@/components/site/hero-rotator";
import { HeroVisual } from "@/components/site/hero-visual";
import { Reveal } from "@/components/site/reveal";
import { Section } from "@/components/site/section";
import { SmartLink } from "@/components/site/smart-link";
import { Tilt } from "@/components/site/tilt";
import { VideoCard } from "@/components/site/video-card";
import { Button } from "@/components/ui/button";
import {
  getLinks,
  getPartners,
  getPosts,
  getServices,
  getSettings,
  getVideos,
  getWorkList,
} from "@/lib/data";
import { defaultServices, parseHeroWords, parseStats } from "@/lib/site";
import { isAllowedImageUrl } from "@/lib/utils";

// A scrolling marquee once there are enough logos to fill it, otherwise a
// centred row.
function PartnerList({
  scroll,
  children,
}: {
  scroll: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mt-8">
      {scroll ? (
        <Marquee>{children}</Marquee>
      ) : (
        <ul className="flex flex-wrap items-center justify-center gap-x-14 gap-y-6">
          {children}
        </ul>
      )}
    </div>
  );
}

export default async function HomePage() {
  const [settings, work, services, posts, partners, liveLinks, videos] =
    await Promise.all([
      getSettings(),
      getWorkList(),
      getServices(),
      getPosts(),
      getPartners(),
      getLinks("live"),
      getVideos(),
    ]);

  const stats = parseStats(settings.stats);
  const featured = work.filter((item) => item.featured);
  const showcase = (featured.length ? featured : work).slice(0, 3);
  const serviceList = (services.length ? services : defaultServices).slice(0, 6);
  const featuredVideos = videos.filter((video) => video.featured);
  const videoList = (featuredVideos.length ? featuredVideos : videos).slice(0, 3);
  const news = [
    ...posts.filter((post) => post.featured),
    ...posts.filter((post) => !post.featured),
  ].slice(0, 3);

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-40 size-[36rem] rounded-full bg-[radial-gradient(circle,rgba(217,4,41,0.12),transparent_65%)]"
        />
        <div className="container-page relative grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <h1>
              <span className="eyebrow">{settings.tagline}</span>
              <span className="mt-5 block">
                <HeroRotator
                  prefix={settings.heroPrefix}
                  words={parseHeroWords(settings.heroWords)}
                />
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              {settings.description}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              {settings.heroPrimaryLabel && settings.heroPrimaryHref && (
                <Button asChild size="lg">
                  <SmartLink href={settings.heroPrimaryHref}>
                    {settings.heroPrimaryLabel} <ArrowRight />
                  </SmartLink>
                </Button>
              )}
              {settings.heroSecondaryLabel && settings.heroSecondaryHref && (
                <Button asChild size="lg" variant="outline">
                  <SmartLink href={settings.heroSecondaryHref}>
                    {settings.heroSecondaryLabel}
                  </SmartLink>
                </Button>
              )}
            </div>
          </div>
          <div className="relative">
            <HeroVisual />
            <div
              aria-hidden="true"
              className="absolute -bottom-5 -left-5 -z-10 size-40 rounded-lg bg-brand-soft"
            />
          </div>
        </div>
        {stats.length > 0 && (
          <div className="bg-ink text-white">
            <dl className="container-page grid grid-cols-2 gap-y-8 py-10 lg:grid-cols-4">
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
          </div>
        )}
      </section>

      {settings.showLive && liveLinks.length > 0 && (
        <Section
          tone="mist"
          eyebrow="Live now"
          title="Watch the action"
          intro="Tournaments we're playing or broadcasting right now."
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {liveLinks.map((link, index) => (
              <Reveal key={link.id} delay={(index % 3) * 0.08}>
                <LiveLinkCard link={link} />
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {settings.showServices && (
        <Section
          eyebrow="What we do"
          title="One organization, every part of esports"
          intro="From the roster to the broadcast to the brand deal, handled by one accountable team."
          link={{ href: "/services", label: "All services" }}
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {serviceList.map((service, index) => (
              <Reveal key={service.title} delay={(index % 3) * 0.08}>
                <Spotlight>
                  <ServiceCard service={service} />
                </Spotlight>
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {settings.showVideos && videoList.length > 0 && (
        <section className="relative overflow-hidden bg-ink py-16 text-white sm:py-24">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(217,4,41,0.35),transparent_45%)]"
          />
          <div className="container-page relative">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-2xl">
                <p className="eyebrow text-white/70">Videos</p>
                <h2 className="heading-display mt-4 text-4xl sm:text-5xl">
                  Highlights &amp; behind the scenes
                </h2>
              </div>
              <SmartLink
                href="/videos"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white"
              >
                All videos <ArrowRight className="size-4" />
              </SmartLink>
            </div>
            <div className="grid gap-6 text-ink sm:grid-cols-2 lg:grid-cols-3">
              {videoList.map((video, index) => (
                <Reveal key={video.id} delay={index * 0.08}>
                  <VideoCard video={video} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {settings.showPortfolio && showcase.length > 0 && (
        <Section
          tone="mist"
          eyebrow="Portfolio"
          title="Events produced"
          intro="Tournaments and productions delivered by Fusion Esports."
          link={{ href: "/portfolio", label: "View the full portfolio" }}
        >
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {showcase.map((item, index) => (
              <Reveal key={item.id} delay={index * 0.08}>
                <Tilt>
                  <WorkCard item={item} />
                </Tilt>
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {settings.showNews && news.length > 0 && (
        <Section
          tone="mist"
          eyebrow="News"
          title="Latest from Fusion"
          link={{ href: "/news", label: "All news" }}
        >
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {news.map((post, index) => (
              <Reveal key={post.id} delay={index * 0.08}>
                <NewsCard post={post} />
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {settings.showPartners && partners.length > 0 && (
        <section className="border-b border-line py-14">
          <div className="container-page">
            <h2 className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Trusted by our partners
            </h2>
            <PartnerList scroll={partners.length >= 6}>
              {partners.map((partner) => {
                const logo =
                  partner.logo && isAllowedImageUrl(partner.logo) ? (
                    <Image
                      src={partner.logo}
                      alt={partner.name}
                      width={140}
                      height={48}
                      className="h-10 w-auto object-contain opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0"
                    />
                  ) : (
                    <span className="heading-display text-2xl text-muted">
                      {partner.name}
                    </span>
                  );
                return (
                  <li key={partner.id}>
                    {partner.url ? (
                      <a href={partner.url} target="_blank" rel="noopener noreferrer">
                        {logo}
                      </a>
                    ) : (
                      logo
                    )}
                  </li>
                );
              })}
            </PartnerList>
          </div>
        </section>
      )}

      <section className="bg-brand text-white">
        <div className="container-page flex flex-col items-start justify-between gap-8 py-16 md:flex-row md:items-center">
          <div>
            <h2 className="heading-display text-4xl sm:text-5xl">
              Ready to build something together?
            </h2>
            <p className="mt-3 max-w-xl text-lg text-white/85">
              Talk to us about partnerships, events and joining the roster.
            </p>
          </div>
          <Button asChild size="lg" variant="inverse">
            <SmartLink href="/contact">
              Get in touch <ArrowRight />
            </SmartLink>
          </Button>
        </div>
      </section>
    </>
  );
}
