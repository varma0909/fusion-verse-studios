import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fusion Verse Studios | AI-Powered Filmmaking",
  description:
    "A next-generation creative production studio shaping the future of AI filmmaking and cinematic storytelling.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
