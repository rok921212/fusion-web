import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Geist, Geist_Mono } from "next/font/google";
import { getSettings, getSocials } from "@/lib/data";
import { JsonLd, organizationLd, websiteLd } from "@/lib/seo";
import { keywords, siteUrl } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const title = `${settings.siteName} | ${settings.tagline}`;
  return {
    metadataBase: new URL(siteUrl),
    title: { default: title, template: `%s | ${settings.siteName}` },
    description: settings.description,
    applicationName: settings.siteName,
    keywords,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: settings.siteName,
      locale: "en_US",
      url: "/",
      title,
      description: settings.description,
      ...(settings.ogImage && { images: [settings.ogImage] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: settings.description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { "max-image-preview": "large", "max-snippet": -1 },
    },
    ...(process.env.GOOGLE_SITE_VERIFICATION && {
      verification: { google: process.env.GOOGLE_SITE_VERIFICATION },
    }),
  };
}

export const viewport: Viewport = {
  themeColor: "#d90429",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [settings, socials] = await Promise.all([getSettings(), getSocials()]);
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${barlow.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <JsonLd data={organizationLd(settings, socials.map((social) => social.url))} />
        <JsonLd data={websiteLd(settings)} />
      </body>
    </html>
  );
}
