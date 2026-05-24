/* eslint-disable @next/next/no-img-element */
import type { RenderFn, RenderInput } from "../shared/types";

const STAR_PATH =
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

function GoldStars() {
  return (
    <span style={{ display: "flex", gap: 4 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg
          key={i}
          width="24"
          height="24"
          viewBox="0 0 24 24"
          style={{ display: "flex" }}
        >
          <path d={STAR_PATH} fill="#FFD63A" />
        </svg>
      ))}
    </span>
  );
}

function buildSubText(input: RenderInput): string {
  const parts: string[] = [];
  if (input.serviceArea) parts.push(input.serviceArea);
  if (input.isLicensed && input.isInsured) parts.push("Licensed · Insured");
  else if (input.isLicensed) parts.push("Licensed");
  else if (input.isInsured) parts.push("Insured");
  return parts.join(" · ");
}

export const drivewayReviewTrust: RenderFn = (input: RenderInput) => {
  const subText = buildSubText(input);
  const hasReviews = !!input.googleReviewCount;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 1080,
        height: 1080,
        fontFamily: "Inter",
        background: "#1E3A5F",
      }}
    >
      {/* ── Top header ── */}
      <div
        style={{
          background: "#1E3A5F",
          padding: "42px 52px 36px",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        {/* Headline */}
        <div
          style={{
            fontSize: 52,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: 0.5,
            lineHeight: 1.15,
            display: "flex",
          }}
        >
          {input.headline}
        </div>

        {/* Stars + review count */}
        {hasReviews && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginTop: 14,
            }}
          >
            <GoldStars />
            <span
              style={{
                fontSize: 28,
                color: "rgba(255,255,255,0.75)",
                display: "flex",
              }}
            >
              {input.googleReviewCount} Google reviews
            </span>
          </div>
        )}

        {/* Sub text: service area + licensed/insured */}
        {subText.length > 0 && (
          <div
            style={{
              fontSize: 24,
              color: "rgba(255,255,255,0.55)",
              marginTop: 10,
              letterSpacing: 0.8,
              display: "flex",
            }}
          >
            {subText}
          </div>
        )}
      </div>

      {/* ── Before / After split ── */}
      <div style={{ flex: 1, display: "flex" }}>
        {/* Before */}
        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          <img
            src={input.beforeImageDataUrl}
            alt="before"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          {/* BEFORE label */}
          <div
            style={{
              position: "absolute",
              bottom: 20,
              left: 20,
              background: "rgba(0,0,0,0.55)",
              color: "#ffffff",
              padding: "6px 18px",
              display: "flex",
            }}
          >
            <span
              style={{
                fontFamily: "JetBrains Mono",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 4,
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              BEFORE
            </span>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{ width: 4, background: "#ffffff", flexShrink: 0, display: "flex" }}
        />

        {/* After */}
        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          <img
            src={input.afterImageDataUrl}
            alt="after"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          {/* AFTER label */}
          <div
            style={{
              position: "absolute",
              bottom: 20,
              right: 20,
              background: "rgba(0,0,0,0.55)",
              color: "#ffffff",
              padding: "6px 18px",
              display: "flex",
            }}
          >
            <span
              style={{
                fontFamily: "JetBrains Mono",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 4,
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              AFTER
            </span>
          </div>
        </div>
      </div>

      {/* ── Bottom trust bar ── */}
      <div
        style={{
          background: "#1E3A5F",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 52px",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: "rgba(255,255,255,0.65)",
            fontSize: 22,
            letterSpacing: 3,
            textTransform: "uppercase",
            display: "flex",
          }}
        >
          {input.isLicensed && input.isInsured
            ? "LICENSED · INSURED"
            : input.isLicensed
            ? "LICENSED"
            : input.isInsured
            ? "INSURED"
            : input.businessName ?? ""}
        </span>
        {input.phone && (
          <span
            style={{
              color: "rgba(255,255,255,0.50)",
              fontSize: 22,
              display: "flex",
            }}
          >
            {input.phone}
          </span>
        )}
      </div>
    </div>
  );
};
