import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "10円ベル（10円セール通知）",
  description: "FANZAで10円になった作品をまとめて表示し、見つかったらスマホに通知します。登録不要・無料。",
  manifest: "/sale/manifest.webmanifest",
  icons: {
    icon: [{ url: "/sale/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/sale/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "10円ベル",
    statusBarStyle: "black-translucent",
  },
  alternates: { canonical: "/sale" },
};

export const viewport: Viewport = {
  themeColor: "#1c1210",
};

export default function SaleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
