import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "../contexts/LanguageContext";
import SessionProvider from "@/components/SessionProvider";

// 建议的页面标题配置
const SITE_CONFIG = {
  title: "QualiProbe",
  slogan: "重构定性研究的 AI Agent",
  description: "从大纲设计到笔录洞察，全链路赋能深度访谈研究"
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: SITE_CONFIG.title,
  description: SITE_CONFIG.description,
  keywords: ["定性研究", "AI Agent", "访谈分析", "用户研究"],
  authors: [{ name: "QualiProbe Team" }],
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: SITE_CONFIG.title,
    description: SITE_CONFIG.slogan,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
