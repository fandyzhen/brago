/* eslint-disable @next/next/no-img-element */
import type { RenderFn, RenderInput } from "../shared/types";

export const drivewayProjectNo: RenderFn = (input: RenderInput) => {
  const projectNum = input.projectNumber ?? 1;
  const displayName = input.businessName ?? "Local Pro";
  const displayArea = input.serviceArea ?? "";

  const trustBadge =
    input.isLicensed && input.isInsured
      ? "Licensed & Insured"
      : input.isLicensed
      ? "Licensed"
      : input.isInsured
      ? "Insured"
      : "";

  const bottomText = [displayName, trustBadge].filter(Boolean).join(" · ");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 1080,
        height: 1080,
        fontFamily: "Inter",
        background: "#0A0A0A",
      }}
    >
      {/* ── Top bar: project number + headline ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "36px 48px 28px",
          flexShrink: 0,
        }}
      >
        {/* Left: Project # */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: 24,
              color: "rgba(255,255,255,0.35)",
              letterSpacing: 6,
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            Project
          </span>
          <span
            style={{
              fontSize: 96,
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1,
              marginTop: 4,
              display: "flex",
            }}
          >
            #{projectNum}
          </span>
        </div>

        {/* Right: headline + area */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            maxWidth: 500,
          }}
        >
          <span
            style={{
              fontSize: 30,
              color: "rgba(255,255,255,0.35)",
              letterSpacing: 4,
              textTransform: "uppercase",
              display: "flex",
              textAlign: "right",
            }}
          >
            {input.headline}
          </span>
          {displayArea && (
            <span
              style={{
                fontSize: 24,
                color: "rgba(255,255,255,0.25)",
                marginTop: 8,
                display: "flex",
              }}
            >
              {displayArea}
            </span>
          )}
        </div>
      </div>

      {/* ── Photos: stacked (before top / after bottom) ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
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
          <div
            style={{
              position: "absolute",
              top: 24,
              left: 36,
              display: "flex",
            }}
          >
            <span
              style={{
                fontFamily: "JetBrains Mono",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 7,
                color: "rgba(255,255,255,0.60)",
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              Before
            </span>
          </div>
        </div>

        {/* Gap */}
        <div
          style={{ height: 6, background: "#0A0A0A", flexShrink: 0, display: "flex" }}
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
          <div
            style={{
              position: "absolute",
              bottom: 24,
              right: 36,
              display: "flex",
            }}
          >
            <span
              style={{
                fontFamily: "JetBrains Mono",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 7,
                color: "rgba(255,255,255,0.60)",
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              After
            </span>
          </div>
        </div>
      </div>

      {/* ── Bottom minimal ── */}
      <div
        style={{
          padding: "22px 48px 30px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            height: 1,
            background: "rgba(255,255,255,0.10)",
            marginBottom: 18,
            display: "flex",
          }}
        />
        <div
          style={{
            fontSize: 22,
            color: "rgba(255,255,255,0.30)",
            letterSpacing: 4,
            textAlign: "center",
            textTransform: "uppercase",
            display: "flex",
            justifyContent: "center",
          }}
        >
          {bottomText}
        </div>
      </div>
    </div>
  );
};
