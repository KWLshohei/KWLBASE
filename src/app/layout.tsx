import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KWL 好み交換カード | 関西ウイスキーラバーズ",
  description:
    "「何が好きで、何が苦手か」を一目で伝える、関西ウイスキーラバーズの名刺がわりのカード画像を作ります。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
