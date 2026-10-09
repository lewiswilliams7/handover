import { ImageResponse } from "next/og";

export const ogImageAlt = "Handover - Know which clients need your attention";
export const ogImageSize = {
  width: 1200,
  height: 630,
};
export const ogImageContentType = "image/png";

async function loadInter(weight: 400 | 600 | 700) {
  const url = `https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-${weight}-normal.woff`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load Inter ${weight}: ${res.status}`);
  }
  return res.arrayBuffer();
}

/** Shared ImageResponse for root and /blog opengraph-image routes. */
export async function createHandoverOgImage() {
  const [interRegular, interSemiBold, interBold] = await Promise.all([
    loadInter(400),
    loadInter(600),
    loadInter(700),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "72px 80px",
          background: "#0B1220",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 70% 55% at 50% 35%, rgba(56,189,248,0.18) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "#38BDF8",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            maxWidth: "980px",
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              fontFamily: "Inter",
              color: "#FFFFFF",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            Know which clients need your attention
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 30,
              fontWeight: 600,
              fontFamily: "Inter",
              color: "#7DD3FC",
              lineHeight: 1.3,
            }}
          >
            Handover - client intelligence for MSPs
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            right: 48,
            bottom: 40,
            fontSize: 22,
            fontWeight: 400,
            fontFamily: "Inter",
            color: "#64748B",
            zIndex: 1,
          }}
        >
          gethandover.uk
        </div>
      </div>
    ),
    {
      ...ogImageSize,
      fonts: [
        { name: "Inter", data: interRegular, style: "normal", weight: 400 },
        { name: "Inter", data: interSemiBold, style: "normal", weight: 600 },
        { name: "Inter", data: interBold, style: "normal", weight: 700 },
      ],
    },
  );
}
