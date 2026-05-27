import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { CinematicBackground } from "@/components/cinematic-background";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Verdict",
  description: "Consensus-resolved prediction markets on Somnia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${instrumentSerif.variable}`}>
        <CinematicBackground />
        {children}
      </body>
    </html>
  );
}
