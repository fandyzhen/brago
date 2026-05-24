/* eslint-disable @next/next/no-img-element */
import type { RenderFn, RenderInput } from "../shared/types";

export const projectNoDetail: RenderFn = (input: RenderInput) => {
  const projectStr =
    typeof input.projectNumber === "number"
      ? String(input.projectNumber).padStart(3, "0")
      : "001";

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
      {/* Header strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "26px 36px",
          background: "#111111",
        }}
      >
        <span
          style={{
            fontFamily: "JetBrains Mono",
            fontSize: 14,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "#FFD63A",
            display: "flex",
          }}
        >
          Project No.
        </span>
        <span
          style={{
            fontFamily: "Inter",
            fontSize: 30,
            fontWeight: 700,
            color: "#FFFFFF",
            display: "flex",
          }}
        >
          {projectStr}
        </span>
      </div>

      {/* Stacked photos */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          <img
            src={input.beforeImageDataUrl}
            alt="before"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              top: 18,
              left: 18,
              display: "flex",
              background: "rgba(0,0,0,0.72)",
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
        <div style={{ height: 4, background: "#FFD63A", display: "flex" }} />
        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          <img
            src={input.afterImageDataUrl}
            alt="after"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              top: 18,
              left: 18,
              display: "flex",
              background: "rgba(0,0,0,0.72)",
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

      {/* Footer */}
      <div
        style={{
          padding: "20px 36px 28px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            lineHeight: 1.15,
            color: "#FFFFFF",
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          {input.headline}
        </div>
      </div>
    </div>
  );
};
