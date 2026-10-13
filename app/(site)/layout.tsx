import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { SmartLink } from "@/components/site/smart-link";
import { getSettings } from "@/lib/data";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings();
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      {settings.announcement && (
        <div className="bg-ink text-center text-sm text-white">
          <p className="container-page py-2.5">
            {settings.announcementHref ? (
              <SmartLink
                href={settings.announcementHref}
                className="font-medium underline-offset-4 hover:underline"
              >
                {settings.announcement} →
              </SmartLink>
            ) : (
              settings.announcement
            )}
          </p>
        </div>
      )}
      <Header siteName={settings.siteName} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
