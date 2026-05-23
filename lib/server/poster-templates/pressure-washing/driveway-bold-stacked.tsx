/* eslint-disable @next/next/no-img-element */
import type { RenderFn, RenderInput } from "../shared/types";

const STAR_PATH =
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

function GoldStars() {
  return (
    <span style={{ display: "flex", gap: 3 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width="20" height="20" viewBox="0 0 24 24" style={{ display: "flex" }}>
          <path d={STAR_PATH} fill="#FFD63A" />
        </svg>
      ))}
    </span>
  );
}

function buildTrustText(input: RenderInput): string {
  const parts: string[] = [];
  if (input.serviceArea) parts.push(input.serviceArea);
  if (input.isLicensed && input.isInsured) parts.push("Licensed · Insured");
  else if (input.isLicensed) parts.push("Licensed");
  else if (input.isInsured) parts.push("Insured");
  return parts.join(" · ");
}

export const drivewayBoldStacked: RenderFn = (input: RenderInput) => {
  const trustText = buildTrustText(input);
  const hasReviews = !!input.googleReviewCount;
  const hasTrust = trustText.length > 0 || hasReviews;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 1080,
        height: 1080,
        fontFamily: "Inter",
        background: "#111111",
      }}
    >
      {/* ── Before photo (top) ── */}
      <div style={{ flex: 1.1, display: "flex", position: "relative" }}>
        <img
          src={input.beforeImageDataUrl}
          alt="before"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        {/* BEFORE pill — top-left */}
        <div
          style={{
            position: "absolute",
            top: 28,
            left: 28,
            display: "flex",
            background: "rgba(0,0,0,0.72)",
            color: "#ffffff",
            padding: "5px 14px",
            borderRadius: 24,
          }}
        >
          <span
            style={{
              fontFamily: "JetBrains Mono",
              fontSize: 15,
              letterSpacing: 2.5,
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            BEFORE
          </span>
        </div>
      </div>

      {/* ── Middle headline band ── */}
      <div
        style={{
          background: "#111111",
          color: "#ffffff",
          padding: "28px 36px 32px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            fontSize: 44,
            fontWeight: 700,
            lineHeight: 1.15,
            color: "#ffffff",
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          {input.headline}
        </div>

        {hasTrust && (
          <div
            style={{
              fontSize: 20,
              color: "rgba(255,255,255,0.55)",
              marginTop: 10,
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {trustText.length > 0 && (
              <span style={{ display: "flex" }}>{trustText}</span>
            )}
            {trustText.length > 0 && hasReviews && (
              <span style={{ display: "flex" }}>·</span>
            )}
            {hasReviews && (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <GoldStars />
                <span style={{ display: "flex" }}>
                  {input.googleReviewCount} Google reviews
                </span>
              </span>
            )}
          </div>
        )}

        {input.phone && (
          <div
            style={{
              fontSize: 20,
              color: "rgba(255,255,255,0.40)",
              marginTop: 5,
              display: "flex",
            }}
          >
            {input.phone}
          </div>
        )}
      </div>

      {/* ── After photo (bottom) ── */}
      <div style={{ flex: 1.1, display: "flex", position: "relative" }}>
        <img
          src={input.afterImageDataUrl}
          alt="after"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        {/* AFTER pill — bottom-right */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            right: 28,
            display: "flex",
            background: "rgba(0,0,0,0.72)",
            color: "#ffffff",
            padding: "5px 14px",
            borderRadius: 24,
          }}
        >
          <span
            style={{
              fontFamily: "JetBrains Mono",
              fontSize: 15,
              letterSpacing: 2.5,
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            AFTER
          </span>
        </div>
      </div>
    </div>
  );
};
