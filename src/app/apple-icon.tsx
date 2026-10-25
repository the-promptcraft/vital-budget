import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(145deg, #0F172A 0%, #1E293B 45%, #0071E3 100%)",
          borderRadius: "40px",
          color: "white",
          fontSize: 78,
          fontWeight: 800,
          letterSpacing: "-0.06em",
        }}
      >
        K
      </div>
    ),
    {
      ...size,
    }
  );
}
