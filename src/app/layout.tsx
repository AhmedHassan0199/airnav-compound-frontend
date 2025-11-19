import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ReactNode } from "react";
import GlobalLoaderOverlay from "@/components/GlobalLoaderOverlay";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "اتحاد شاغلين مدينة الملاحة الجوية",
  description: "بوابة إدارة الصيانة الشهرية للكمبوند",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-brand-beige">
        {children}
        {/* Global loader overlay */}
        <GlobalLoaderOverlay />
      </body>
    </html>
  );
}
