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
        background: "rgba(0,0,0,0.72)",
        color: "#ffffff",
        padding: "4px 12px",
        borderRadius: 20,
      }}
    >
      <span
        style={{
          fontFamily: "JetBrains Mono",
          fontSize: 12,
          letterSpacing: 2,
          textTransform: "uppercase",
          display: "flex",
        }}
      >
        {text}
      </span>
    </div>
  );
}

export const petHairGoneQuote: RenderFn = (input: RenderInput) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 1080,
        height: 1080,
        fontFamily: "Inter",
        background: "#171717",
      }}
    >
      <div style={{ flex: 1, display: "flex" }}>
        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          <img
            src={input.beforeImageDataUrl}
            alt="before"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <PillLabel text="BEFORE" top={22} left={22} />
        </div>
        <div style={{ width: 6, background: "#171717", display: "flex" }} />
        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          <img
            src={input.afterImageDataUrl}
            alt="after"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <PillLabel text="AFTER" top={22} left={22} />
        </div>
      </div>

      {/* CTA card */}
      <div
        style={{
          background: "#171717",
          padding: "28px 40px 36px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            fontSize: 50,
            fontWeight: 700,
            lineHeight: 1.1,
            color: "#FFFFFF",
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          {input.headline}
        </div>

        <div
          style={{
            marginTop: 18,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              background: "#FFD63A",
              color: "#171717",
              padding: "10px 18px",
              borderRadius: 8,
              fontSize: 17,
              fontWeight: 700,
              fontFamily: "Inter",
            }}
          >
            Message for a quote
          </div>
          {input.phone && (
            <span style={{ fontSize: 18, color: "rgba(255,255,255,0.7)", display: "flex" }}>
              {input.phone}
            </span>
          )}
        </div>

        {input.serviceArea && (
          <div
            style={{
              fontSize: 16,
              color: "rgba(255,255,255,0.45)",
              marginTop: 12,
              display: "flex",
            }}
          >
            {input.serviceArea}
          </div>
        )}
      </div>
    </div>
  );
};
