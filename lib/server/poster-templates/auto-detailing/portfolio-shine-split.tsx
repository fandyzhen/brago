/* eslint-disable @next/next/no-img-element */
import type { RenderFn, RenderInput } from "../shared/types";

export const portfolioShineSplit: RenderFn = (input: RenderInput) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 1080,
        height: 1080,
        fontFamily: "Inter",
        background: "#FFFFFF",
        padding: 40,
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          gap: 12,
        }}
      >
        <div style={{ flex: 1, display: "flex", position: "relative", overflow: "hidden", borderRadius: 12 }}>
          <img
            src={input.beforeImageDataUrl}
            alt="before"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 16,
              left: 16,
              display: "flex",
              background: "rgba(0,0,0,0.78)",
              color: "#ffffff",
              padding: "4px 10px",
              borderRadius: 18,
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
        <div style={{ flex: 1, display: "flex", position: "relative", overflow: "hidden", borderRadius: 12 }}>
          <img
            src={input.afterImageDataUrl}
            alt="after"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 16,
              left: 16,
              display: "flex",
              background: "rgba(0,0,0,0.78)",
              color: "#ffffff",
              padding: "4px 10px",
              borderRadius: 18,
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
              AFTER
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 28,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontSize: 42,
            fontWeight: 700,
            lineHeight: 1.15,
            color: "#171717",
            textAlign: "center",
            display: "flex",
          }}
        >
          {input.headline}
        </div>
        {input.businessName && (
          <div
            style={{
              marginTop: 10,
              fontFamily: "JetBrains Mono",
              fontSize: 14,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#6B6862",
              display: "flex",
            }}
          >
            {input.businessName}
          </div>
        )}
      </div>
    </div>
  );
};
