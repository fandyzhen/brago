/* eslint-disable @next/next/no-img-element */
import type { RenderFn, RenderInput } from "../shared/types";

function PillLabel({ text, top, left }: { text: string; top: number; left: number }) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        display: "flex",
        background: "rgba(0,0,0,0.7)",
        color: "#ffffff",
        padding: "5px 13px",
        borderRadius: 22,
      }}
    >
      <span
        style={{
          fontFamily: "JetBrains Mono",
          fontSize: 13,
          letterSpacing: 2.2,
          textTransform: "uppercase",
          display: "flex",
        }}
      >
        {text}
      </span>
    </div>
  );
}

export const mobileDetailLocalShare: RenderFn = (input: RenderInput) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 1080,
        height: 1080,
        fontFamily: "Inter",
        background: "#FFFFFF",
      }}
    >
      <div style={{ flex: 1, display: "flex", position: "relative" }}>
        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          <img
            src={input.beforeImageDataUrl}
            alt="before"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <PillLabel text="BEFORE" top={24} left={24} />
        </div>
        <div style={{ width: 8, background: "#FFFFFF", display: "flex" }} />
        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          <img
            src={input.afterImageDataUrl}
            alt="after"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <PillLabel text="AFTER" top={24} left={24} />
        </div>
      </div>

      <div
        style={{
          padding: "30px 40px 36px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Small accent dot */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: 999, background: "#FFD63A", display: "flex" }} />
          <span
            style={{
              fontFamily: "JetBrains Mono",
              fontSize: 13,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#6B6862",
              display: "flex",
            }}
          >
            Recent detail
            {input.serviceArea ? ` · ${input.serviceArea}` : ""}
          </span>
        </div>

        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            lineHeight: 1.1,
            color: "#171717",
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          {input.headline}
        </div>

        {input.phone && (
          <div
            style={{
              fontSize: 18,
              color: "#6B6862",
              marginTop: 10,
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
