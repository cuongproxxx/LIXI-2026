import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Be_Vietnam_Pro, Lora } from "next/font/google";
import "./globals.css";

const bodyFont = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap"
});

const headingFont = Lora({
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Rút Lì Xì 2026",
  description: "Rút lì xì đầu năm với trải nghiệm nhẹ, đẹp và mượt trên điện thoại."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi">
      <body className={`${bodyFont.variable} ${headingFont.variable} antialiased`}>{children}</body>
    </html>
  );
}
