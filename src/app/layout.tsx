import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "smokebud",
  description: "a quiet smoke break, together.",
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
