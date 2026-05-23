import type { Metadata } from "next";
import "../src/App.css";

export const metadata: Metadata = {
  title: "Manager Score",
  description: "Anonymous manager reviews from real employees.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
