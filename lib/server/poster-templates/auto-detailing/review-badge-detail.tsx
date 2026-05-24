/* eslint-disable @next/next/no-img-element */
import type { RenderFn, RenderInput } from "../shared/types";

const STAR_PATH =
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

function GoldStars({ size = 24 }: { size?: number }) {
  return (
    <span style={{ display: "flex", gap: 3 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" style={{ display: "flex" }}>
          <path d={STAR_PATH} fill="#FFD63A" />
        </svg>
      ))}
    </span>
  );
}

function PillLabel({ text, top, left }: { text: string; top: number; left: number }) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        display: "flex",
        background: "rgba(0,0,0,0.78)",
        color: "#ffffff",
        padding: "5px 14px",
        borderRadius: 24,
      }}
    >
      <span
        style={{
          fontFamily: "JetBrains Mono",
          fontSize: 14,
          letterSpacing: 2.5,
          textTransform: "uppercase",
          display: "flex",
        }}
      >
        {text}
      </span>
    </div>
  );
}

export const reviewBadgeDetail: RenderFn = (input: RenderInput) => {
  const trustText: string[] = [];
  if (input.isLicensed && input.isInsured) trustText.push("Licensed · Insured");
  else if (input.isLicensed) trustText.push("Licensed");
  else if (input.isInsured) trustText.push("Insured");
  if (input.serviceArea) trustText.push(input.serviceArea);
  const hasReviews = !!input.googleReviewCount;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 1080,
        height: 1080,
        fontFamily: "Inter",
        background: "#F7F4EE",
      }}
    >
      {/* Top review badge bar */}
      {hasReviews && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px 0",
            background: "#FFD63A",
            gap: 12,
          }}
        >
          <GoldStars size={26} />
          <span
            style={{
              fontFamily: "Inter",
              fontSize: 22,
              fontWeight: 700,
              color: "#111111",
              display: "flex",
            }}
          >
            {input.googleReviewCount} Google reviews
          </span>
        </div>
      )}

      {/* Split photos */}
      <div style={{ flex: 1, display: "flex", position: "relative" }}>
        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          <img
            src={input.beforeImageDataUrl}
            alt="before"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          <PillLabel text="BEFORE" top={24} left={24} />
        </div>
        <div style={{ width: 4, background: "#F7F4EE", display: "flex" }} />
        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          <img
            src={input.afterImageDataUrl}
            alt="after"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          <PillLabel text="AFTER" top={24} left={24} />
        </div>
      </div>

      {/* Bottom info */}
      <div
        style={{
          padding: "26px 36px 30px",
          display: "flex",
          flexDirection: "column",
          background: "#F7F4EE",
        }}
      >
        <div
          style={{
            fontSize: 42,
            fontWeight: 700,
            lineHeight: 1.15,
            color: "#111111",
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          {input.headline}
        </div>

        {trustText.length > 0 && (
          <div
            style={{
              fontSize: 19,
              color: "#6B6862",
              marginTop: 8,
              display: "flex",
            }}
          >
            {trustText.join(" · ")}
          </div>
        )}

        {input.phone && (
          <div
            style={{
              fontSize: 19,
              color: "#111111",
              marginTop: 4,
              display: "flex",
              fontWeight: 600,
            }}
          >
            {input.phone}
          </div>
        )}
      </div>
    </div>
  );
};
