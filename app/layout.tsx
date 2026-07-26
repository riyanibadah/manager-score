import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "../src/App.css";

export const metadata: Metadata = {
  title: "ManagerScore",
  description: "Anonymous manager reviews from real employees.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
