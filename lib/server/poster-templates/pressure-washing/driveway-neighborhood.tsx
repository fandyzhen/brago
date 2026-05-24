/* eslint-disable @next/next/no-img-element */
import type { RenderFn, RenderInput } from "../shared/types";

function buildTrustLine(input: RenderInput): string {
  const parts: string[] = [];
  if (input.isLicensed) parts.push("Licensed");
  if (input.isInsured) parts.push("Insured");
  parts.push("Free estimates");
  return parts.join(" · ");
}

export const drivewayNeighborhood: RenderFn = (input: RenderInput) => {
  const trustLine = buildTrustLine(input);
  const locationText = input.serviceArea ?? "Your Area";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 1080,
        height: 1080,
        fontFamily: "Inter",
        background: "#2C3E2D",
      }}
    >
      {/* ── Top: location label ── */}
      <div
        style={{
          background: "#2C3E2D",
          padding: "40px 52px 32px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontSize: 22,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: 8,
            textTransform: "uppercase",
            marginBottom: 12,
            display: "flex",
          }}
        >
          Finished Today In
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: 1,
            lineHeight: 1,
            display: "flex",
          }}
        >
          {locationText}
        </div>
      </div>

      {/* ── Photo cards ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          margin: "0 40px",
          gap: 20,
          paddingBottom: 20,
        }}
      >
        {/* Before card */}
        <div
          style={{
            flex: 1,
            borderRadius: 18,
            overflow: "hidden",
            display: "flex",
            position: "relative",
          }}
        >
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
          {/* Bottom overlay */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: "rgba(0,0,0,0.60)",
              padding: "16px 22px",
              display: "flex",
            }}
          >
            <span
              style={{
                color: "#ffffff",
                fontFamily: "JetBrains Mono",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 5,
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              Before
            </span>
          </div>
        </div>

        {/* After card */}
        <div
          style={{
            flex: 1,
            borderRadius: 18,
            overflow: "hidden",
            display: "flex",
            position: "relative",
          }}
        >
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
          {/* Bottom overlay */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: "rgba(0,0,0,0.60)",
              padding: "16px 22px",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <span
              style={{
                color: "#ffffff",
                fontFamily: "JetBrains Mono",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 5,
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              After
            </span>
          </div>
        </div>
      </div>

      {/* ── Bottom minimal info ── */}
      <div
        style={{
          padding: "20px 52px 40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: 32,
            fontWeight: 600,
            color: "rgba(255,255,255,0.90)",
            display: "flex",
          }}
        >
          {input.headline}
        </div>
        <div
          style={{
            fontSize: 24,
            color: "rgba(255,255,255,0.45)",
            marginTop: 8,
            display: "flex",
          }}
        >
          {trustLine}
        </div>
      </div>
    </div>
  );
};
