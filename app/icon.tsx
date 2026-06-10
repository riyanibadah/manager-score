import { ImageResponse } from "next/og";

export const size = { width: 96, height: 96 };
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
          borderRadius: 24,
        }}
      >
        <div
          style={{
            width: 33,
            height: 42,
            borderTop: "9px solid #ffffff",
            borderRight: "9px solid #ffffff",
            borderRadius: 9,
            transform: "rotate(-35deg) translateY(-7.5px)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
