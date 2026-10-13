import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { defaultSettings } from "@/lib/site";

export const alt = "Fusion Esports";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logo = await readFile(
    path.join(/* turbopackIgnore: true */ process.cwd(), "public/brand/fusion-logo.png"),
  );
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background:
            "radial-gradient(circle at 85% 15%, rgba(217,4,41,0.55), transparent 55%), #111114",
          borderLeft: "28px solid #d90429",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: 6, textTransform: "uppercase" }}>
          Esports organization
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={760} height={300} alt="" />
          <div style={{ display: "flex", marginTop: 28, fontSize: 40, color: "rgba(255,255,255,0.85)" }}>
            {defaultSettings.tagline}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
