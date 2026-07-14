import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT", "WONK"],
  variable: "--font-serif",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://smokebud.app"),
  title: "smokebud — a quiet smoke break, together",
  description:
    "five quiet minutes with a companion who doesn't need you to talk. no feed, no likes, just smoke.",
  openGraph: {
    title: "smokebud — a quiet smoke break, together",
    description: "five quiet minutes with a companion who doesn't need you to talk.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "smokebud — a quiet smoke break, together",
    description: "five quiet minutes with a companion who doesn't need you to talk.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${plexMono.variable}`}>
      <body>
        {children}
        <div className="vignette" aria-hidden />
        <div className="grain" aria-hidden />
      </body>
    </html>
  );
}
