import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Neon Todo Starter",
  description: "Minimal Next.js + Neon Postgres starter"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
