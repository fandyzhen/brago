/* eslint-disable @next/next/no-img-element */
import type { RenderFn, RenderInput } from "../shared/types";
import type { PhotoPair } from "../shared/multi-area-types";

function PairCell({ pair, areaLabel }: { pair: PhotoPair; areaLabel?: string }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "#FFFFFF",
        overflow: "hidden",
        borderRadius: 6,
      }}
    >
      {areaLabel && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "6px 0",
            background: "#111111",
          }}
        >
          <span
            style={{
              fontFamily: "JetBrains Mono",
              fontSize: 11,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#FFFFFF",
              display: "flex",
            }}
          >
            {areaLabel}
          </span>
        </div>
      )}
      <div style={{ flex: 1, display: "flex" }}>
        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          <img
            src={pair.beforeImageDataUrl}
            alt="before"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              display: "flex",
              background: "rgba(0,0,0,0.72)",
              color: "#ffffff",
              padding: "2px 7px",
              borderRadius: 14,
            }}
          >
            <span
              style={{
                fontFamily: "JetBrains Mono",
                fontSize: 9,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              BEFORE
            </span>
          </div>
        </div>
        <div style={{ width: 2, background: "#FFFFFF", display: "flex" }} />
        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          <img
            src={pair.afterImageDataUrl}
            alt="after"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              display: "flex",
              background: "rgba(0,0,0,0.72)",
              color: "#ffffff",
              padding: "2px 7px",
              borderRadius: 14,
            }}
          >
            <span
              style={{
                fontFamily: "JetBrains Mono",
                fontSize: 9,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              AFTER
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export const exteriorMultiAreaProof: RenderFn = (input: RenderInput) => {
  const pairs: PhotoPair[] =
    input.photoPairs && input.photoPairs.length > 0
      ? input.photoPairs.slice(0, 4)
      : [
          {
            beforeImageDataUrl: input.beforeImageDataUrl,
            afterImageDataUrl: input.afterImageDataUrl,
            areaLabel: "Main Area",
          },
        ];

  const useGrid = pairs.length >= 2;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 1080,
        height: 1080,
        fontFamily: "Inter",
        background: "#F7F4EE",
        padding: 28,
        gap: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: 999, background: "#1E5EFF", display: "flex" }} />
          <span
            style={{
              fontFamily: "JetBrains Mono",
              fontSize: 12,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#6B6862",
              display: "flex",
            }}
          >
            Multi-area job{input.serviceArea ? ` · ${input.serviceArea}` : ""}
          </span>
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 36,
            fontWeight: 700,
            lineHeight: 1.1,
            color: "#171717",
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          {input.headline}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: useGrid ? "column" : "row",
          gap: 12,
        }}
      >
        {useGrid ? (
          <>
            <div style={{ flex: 1, display: "flex", gap: 12 }}>
              <PairCell pair={pairs[0]} areaLabel={pairs[0].areaLabel ?? "AREA 1"} />
              {pairs[1] && <PairCell pair={pairs[1]} areaLabel={pairs[1].areaLabel ?? "AREA 2"} />}
            </div>
            {pairs[2] && (
              <div style={{ flex: 1, display: "flex", gap: 12 }}>
                <PairCell pair={pairs[2]} areaLabel={pairs[2].areaLabel ?? "AREA 3"} />
                {pairs[3] && <PairCell pair={pairs[3]} areaLabel={pairs[3].areaLabel ?? "AREA 4"} />}
              </div>
            )}
          </>
        ) : (
          <PairCell pair={pairs[0]} areaLabel={pairs[0].areaLabel} />
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 6,
        }}
      >
        <span
          style={{
            fontFamily: "JetBrains Mono",
            fontSize: 12,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#6B6862",
            display: "flex",
          }}
        >
          {input.businessName ?? "Recent project"}
        </span>
        {input.phone && (
          <span style={{ fontSize: 16, color: "#171717", display: "flex" }}>{input.phone}</span>
        )}
      </div>
    </div>
  );
};
