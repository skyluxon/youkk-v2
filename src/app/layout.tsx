import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "첫 영상 컨셉 잡기",
  description: "처음 유튜브를 시작하는 사람을 위해, AI와 대화하며 숏폼의 주제와 방향을 정합니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
