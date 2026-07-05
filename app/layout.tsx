import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { brand } from "@/lib/brand";
import { AppProviders } from "@/components/AppProviders";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans"
});

export const metadata: Metadata = {
  title: {
    default: brand.name,
    template: `%s | ${brand.name}`
  },
  description: brand.description,
  applicationName: brand.name,
  appleWebApp: {
    capable: true,
    title: brand.name,
    statusBarStyle: "black-translucent"
  },
  icons: {
    icon: [{ url: brand.logoSrc, type: "image/png" }],
    shortcut: [{ url: brand.logoSrc, type: "image/png" }],
    apple: [{ url: brand.logoSrc, type: "image/png" }]
  },
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  themeColor: "#070707",
  colorScheme: "dark"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} font-sans antialiased`} suppressHydrationWarning><script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem(\"app_theme\");document.documentElement.setAttribute(\"data-theme\",t===\"fifa\"?\"fifa\":\"default\")}catch(e){document.documentElement.setAttribute(\"data-theme\",\"default\")}" }} /><AppProviders>{children}</AppProviders></body>
    </html>
  );
}



