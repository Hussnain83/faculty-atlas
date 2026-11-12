import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { Aurora } from "@/components/background/Aurora";
import { FloatingNumbers } from "@/components/background/FloatingNumbers";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz"],
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Faculty Atlas",
    template: "%s · Faculty Atlas",
  },
  description: "Research groups, profiles and publications for Northfield University.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bricolage.variable} ${geist.variable} ${geistMono.variable}`}>
      <body>
        <Aurora />
        <FloatingNumbers />
        {children}
      </body>
    </html>
  );
}
