import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
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
          background: "linear-gradient(135deg, #6d3df1 0%, #5b2df5 45%, #15092f 100%)",
        }}
      >
        <div
          style={{
            width: 62,
            height: 78,
            borderTop: "16px solid #ffffff",
            borderRight: "16px solid #ffffff",
            borderRadius: 16,
            transform: "rotate(-35deg) translateY(-14px)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
