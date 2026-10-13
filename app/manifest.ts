import type { MetadataRoute } from "next";
import { defaultSettings } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: defaultSettings.siteName,
    short_name: "Fusion",
    description: defaultSettings.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#d90429",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
