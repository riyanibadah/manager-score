import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 16,
        }}
      >
        <div
          style={{
            width: 22,
            height: 28,
            borderTop: "6px solid #ffffff",
            borderRight: "6px solid #ffffff",
            borderRadius: 6,
            transform: "rotate(-35deg) translateY(-5px)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
