/* eslint-disable @next/next/no-img-element */
import type { RenderFn, RenderInput } from "../shared/types";

export const drivewayPortfolioSplit: RenderFn = (input: RenderInput) => {
  const displayName = input.businessName ?? "Local Pro";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 1080,
        height: 1080,
        fontFamily: "Inter",
        background: "#FAFAFA",
      }}
    >
      {/* ── Photos: side-by-side, dominant ── */}
      <div style={{ flex: 1, display: "flex", position: "relative" }}>
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
          {/* White pill label */}
          <div
            style={{
              position: "absolute",
              top: 30,
              left: 30,
              background: "rgba(255,255,255,0.90)",
              padding: "8px 22px",
              display: "flex",
            }}
          >
            <span
              style={{
                fontFamily: "JetBrains Mono",
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: 6,
                color: "#1a1a1a",
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              Before
            </span>
          </div>
        </div>

        {/* White divider */}
        <div
          style={{ width: 8, background: "#FAFAFA", flexShrink: 0, display: "flex" }}
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
          {/* White pill label */}
          <div
            style={{
              position: "absolute",
              top: 30,
              right: 30,
              background: "rgba(255,255,255,0.90)",
              padding: "8px 22px",
              display: "flex",
            }}
          >
            <span
              style={{
                fontFamily: "JetBrains Mono",
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: 6,
                color: "#1a1a1a",
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              After
            </span>
          </div>
        </div>
      </div>

      {/* ── Minimal dark bottom strip ── */}
      <div
        style={{
          background: "#1a1a1a",
          padding: "28px 48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: 0.5,
            display: "flex",
          }}
        >
          {input.headline}
        </span>
        <span
          style={{
            fontSize: 22,
            color: "rgba(255,255,255,0.40)",
            letterSpacing: 4,
            textTransform: "uppercase",
            display: "flex",
          }}
        >
          {displayName}
        </span>
      </div>
    </div>
  );
};
