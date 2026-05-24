/* eslint-disable @next/next/no-img-element */
import type { RenderFn, RenderInput } from "../shared/types";

function PillLabel({
  text,
  top,
  left,
  size = "md",
}: {
  text: string;
  top: number;
  left: number;
  size?: "sm" | "md";
}) {
  const fs = size === "sm" ? 11 : 14;
  const pad = size === "sm" ? "3px 9px" : "5px 13px";
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        display: "flex",
        background: "rgba(0,0,0,0.72)",
        color: "#ffffff",
        padding: pad,
        borderRadius: 22,
      }}
    >
      <span
        style={{
          fontFamily: "JetBrains Mono",
          fontSize: fs,
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

export const drivewayDetailProof: RenderFn = (input: RenderInput) => {
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
      {/* Large after photo on top */}
      <div style={{ height: 620, display: "flex", position: "relative" }}>
        <img
          src={input.afterImageDataUrl}
          alt="after"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        <PillLabel text="AFTER" top={28} left={28} size="md" />
      </div>

      {/* Before strip */}
      <div style={{ height: 260, display: "flex", position: "relative", borderTop: "4px solid #FFD63A" }}>
        <img
          src={input.beforeImageDataUrl}
          alt="before"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        <PillLabel text="BEFORE" top={20} left={28} size="sm" />
      </div>

      {/* Info bar */}
      <div
        style={{
          flex: 1,
          padding: "24px 36px",
          display: "flex",
          flexDirection: "column",
          background: "#FFFFFF",
        }}
      >
        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            lineHeight: 1.1,
            color: "#171717",
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          {input.headline}
        </div>

        <div
          style={{
            marginTop: 8,
            fontSize: 17,
            color: "#6B6862",
            display: "flex",
            gap: 8,
          }}
        >
          {input.serviceArea && <span style={{ display: "flex" }}>{input.serviceArea}</span>}
          {input.serviceArea && input.phone && <span style={{ display: "flex" }}>·</span>}
          {input.phone && <span style={{ display: "flex" }}>{input.phone}</span>}
        </div>
      </div>
    </div>
  );
};
