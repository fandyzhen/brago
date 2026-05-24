/* eslint-disable @next/next/no-img-element */
import type { RenderFn, RenderInput } from "../shared/types";

export const drivewaySoftQuote: RenderFn = (input: RenderInput) => {
  const displayName = input.businessName ?? "Your Local Pro";
  const displayArea = input.serviceArea ?? "";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 1080,
        height: 1080,
        fontFamily: "Inter",
        background: "#F5F0EB",
      }}
    >
      {/* ── Slim top bar ── */}
      <div
        style={{
          background: "#3A2E24",
          height: 96,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 48px",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: "#D4B896",
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: "uppercase",
            display: "flex",
          }}
        >
          {displayName}
        </span>
        {displayArea && (
          <span
            style={{
              color: "rgba(212,184,150,0.55)",
              fontSize: 22,
              display: "flex",
            }}
          >
            {displayArea}
          </span>
        )}
      </div>

      {/* ── Large before/after photos ── */}
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
              top: 24,
              left: 24,
              background: "rgba(58,46,36,0.80)",
              color: "#D4B896",
              padding: "8px 20px",
              display: "flex",
            }}
          >
            <span
              style={{
                fontFamily: "JetBrains Mono",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 5,
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
          style={{ width: 6, background: "#F5F0EB", flexShrink: 0, display: "flex" }}
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
              top: 24,
              right: 24,
              background: "rgba(58,46,36,0.80)",
              color: "#D4B896",
              padding: "8px 20px",
              display: "flex",
            }}
          >
            <span
              style={{
                fontFamily: "JetBrains Mono",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 5,
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              AFTER
            </span>
          </div>
        </div>
      </div>

      {/* ── Soft CTA bottom ── */}
      <div
        style={{
          background: "#F5F0EB",
          padding: "32px 48px 36px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: "#3A2E24",
            lineHeight: 1.3,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {input.headline}
        </div>
        <div
          style={{
            fontSize: 26,
            color: "#8B7355",
            marginTop: 10,
            display: "flex",
          }}
        >
          Message us for a free estimate · No obligation
        </div>
      </div>
    </div>
  );
};
