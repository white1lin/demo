import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 求职助手学习项目",
  description: "从 0 学会用 Codex 创造一个 AI 产品"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
