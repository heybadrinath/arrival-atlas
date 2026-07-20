import { ImageResponse } from "next/og";

export const alt = "Arrival Atlas — historical US flight reliability by route";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        background: "#071922",
        color: "#fffdf7",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontSize: 28,
          fontWeight: 700,
        }}
      >
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            border: "1px solid #a8d8d0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ed715f",
          }}
        >
          •—•
        </span>
        Arrival Atlas
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <span
            style={{ fontSize: 92, fontWeight: 800, letterSpacing: "-7px" }}
          >
            LAX
          </span>
          <span style={{ width: 280, borderTop: "3px dashed #a8d8d0" }} />
          <span
            style={{ fontSize: 92, fontWeight: 800, letterSpacing: "-7px" }}
          >
            SFO
          </span>
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 50,
            fontWeight: 700,
            letterSpacing: "-2px",
          }}
        >
          Know the route before you book.
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 23,
            color: "rgba(255,255,255,.68)",
          }}
        >
          Historical reliability by route, airline, month, and departure time.
        </div>
      </div>
      <div style={{ fontSize: 18, color: "#a8d8d0", letterSpacing: "2px" }}>
        OFFICIAL BTS RECORDS · DESCRIPTIVE ANALYTICS
      </div>
    </div>,
    size,
  );
}
