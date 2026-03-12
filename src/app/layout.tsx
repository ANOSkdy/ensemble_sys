import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Airwork Ops Console",
  description: "Airwork bulk update and operations console",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body className="bg-[#F9F9F9] text-slate-800 antialiased">{children}</body>
    </html>
  )
}
