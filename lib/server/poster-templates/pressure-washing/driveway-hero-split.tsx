import type { RenderFn, RenderInput } from "../shared/types";

function buildTrustLine(input: RenderInput): string {
  const parts: string[] = [];
  if (input.serviceArea) parts.push(input.serviceArea);
  if (input.isLicensed && input.isInsured) parts.push("Licensed · Insured");
  else if (input.isLicensed) parts.push("Licensed");
  else if (input.isInsured) parts.push("Insured");
  if (input.googleReviewCount) parts.push(`★★★★★ ${input.googleReviewCount} Google reviews`);
  return parts.join(" · ");
}

export const driveWayHeroSplit: RenderFn = (input: RenderInput) => {
  const trustLine = buildTrustLine(input);

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
      {/* ── Main photo area ── */}
      <div style={{ flex: 1, display: "flex", position: "relative" }}>
        {/* After photo — full bleed */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
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

        {/* AFTER pill label */}
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
            AFTER
          </span>
        </div>

        {/* Before thumbnail — bottom-left */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            left: 28,
            width: 260,
            height: 260,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRadius: 10,
            border: "3px solid rgba(255,255,255,0.9)",
          }}
        >
          {/* Inner wrapper: position:relative so the BEFORE label can be absolute */}
          <div style={{ flex: 1, display: "flex", position: "relative" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
            {/* BEFORE pill label */}
            <div
              style={{
                position: "absolute",
                top: 10,
                left: 10,
                display: "flex",
                background: "rgba(0,0,0,0.72)",
                color: "#ffffff",
                padding: "3px 9px",
                borderRadius: 20,
              }}
            >
              <span
                style={{
                  fontFamily: "JetBrains Mono",
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  display: "flex",
                }}
              >
                BEFORE
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom info bar ── */}
      <div
        style={{
          background: "#111111",
          color: "#ffffff",
          padding: "28px 36px 32px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Headline */}
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

        {/* Trust line */}
        {trustLine.length > 0 && (
          <div
            style={{
              fontSize: 20,
              color: "rgba(255,255,255,0.55)",
              marginTop: 10,
              display: "flex",
            }}
          >
            {trustLine}
          </div>
        )}

        {/* Phone */}
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
    </div>
  );
};
