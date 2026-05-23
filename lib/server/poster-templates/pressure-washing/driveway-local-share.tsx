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

const WARM_TAN = "#C9A870";
const DARK_BROWN = "#4A2A18";
const HEADER_TEXT = "#1A0C08";

export const drivewayLocalShare: RenderFn = (input: RenderInput) => {
  const trustText = buildTrustText(input);
  const hasReviews = !!input.googleReviewCount;
  const hasTrust = trustText.length > 0 || hasReviews;

  return (
    <div style={{ display: "flex", flexDirection: "column", width: 1080, height: 1080, fontFamily: "Inter", background: WARM_TAN }}>

      {/* ── Top header bar ── */}
      <div style={{ display: "flex", flexDirection: "row", height: 194, flexShrink: 0, background: WARM_TAN }}>
        {/* Left: headline + trust */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "36px 40px" }}>
          <div style={{ fontSize: 44, fontWeight: 700, color: HEADER_TEXT, lineHeight: 1.15, display: "flex", flexWrap: "wrap" }}>
            {input.headline}
          </div>
          {hasTrust && (
            <div style={{ fontSize: 20, color: "rgba(26,12,8,0.6)", marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {trustText.length > 0 && <span style={{ display: "flex" }}>{trustText}</span>}
              {trustText.length > 0 && hasReviews && <span style={{ display: "flex" }}>·</span>}
              {hasReviews && (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <GoldStars />
                  <span style={{ display: "flex" }}>{input.googleReviewCount} Google reviews</span>
                </span>
              )}
            </div>
          )}
          {input.phone && (
            <div style={{ fontSize: 18, color: "rgba(26,12,8,0.45)", marginTop: 5, display: "flex" }}>
              {input.phone}
            </div>
          )}
        </div>
        {/* Right: dark brown accent square */}
        <div style={{ width: 194, flexShrink: 0, background: DARK_BROWN }} />
      </div>

      {/* ── Bottom: Left / Right split ── */}
      <div style={{ flex: 1, display: "flex" }}>

        {/* Left column: BEFORE label (top) + Before photo (bottom) */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "3px solid #ffffff" }}>
          {/* BEFORE label area */}
          <div style={{ height: 230, flexShrink: 0, background: DARK_BROWN, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span style={{ fontFamily: "JetBrains Mono", fontSize: 28, fontWeight: 700, color: WARM_TAN, letterSpacing: 3.5, textTransform: "uppercase", display: "flex" }}>
              BEFORE
            </span>
            <span style={{ fontFamily: "JetBrains Mono", fontSize: 15, color: "rgba(201,168,112,0.65)", letterSpacing: 2.5, textTransform: "uppercase", display: "flex" }}>
              SNAPSHOT
            </span>
          </div>
          {/* Before photo */}
          <div style={{ flex: 1, display: "flex", position: "relative" }}>
            <img src={input.beforeImageDataUrl} alt="before" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </div>

        {/* Right column: After photo (top) + AFTER label (bottom) */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* After photo */}
          <div style={{ flex: 1, display: "flex", position: "relative" }}>
            <img src={input.afterImageDataUrl} alt="after" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          {/* AFTER label area */}
          <div style={{ height: 230, flexShrink: 0, background: DARK_BROWN, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span style={{ fontFamily: "JetBrains Mono", fontSize: 28, fontWeight: 700, color: WARM_TAN, letterSpacing: 3.5, textTransform: "uppercase", display: "flex" }}>
              AFTER
            </span>
            <span style={{ fontFamily: "JetBrains Mono", fontSize: 15, color: "rgba(201,168,112,0.65)", letterSpacing: 2.5, textTransform: "uppercase", display: "flex" }}>
              SNAPSHOT
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
