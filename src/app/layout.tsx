import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PropShorts — AI Property Recommendations",
  description: "AI-powered assistant portal for real estate brokers",
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
