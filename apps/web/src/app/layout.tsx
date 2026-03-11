import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { VersionCheck } from "@/components/version-check";
import { Footer } from "@/components/footer";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ETF Canvas - 나만의 ETF 포트폴리오를 그리다",
  description: "ETF를 골라 담고, 비중을 조절하고, 성과를 시뮬레이션하세요. 나만의 ETF 포트폴리오를 그리다.",
  icons: {
    icon: "/favicon.svg",
  },
  metadataBase: new URL('https://etf-canvas.com'),
  alternates: { canonical: '/' },
  openGraph: {
    title: 'ETF Canvas - 나만의 ETF 포트폴리오를 그리다',
    description: 'ETF를 골라 담고, 비중을 조절하고, 성과를 시뮬레이션하세요.',
    url: 'https://etf-canvas.com',
    siteName: 'ETF Canvas',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <VersionCheck />
        <Providers>
          {children}
          <Footer />
          <Toaster position="top-center" toastOptions={{ style: { width: 'fit-content', minWidth: 'unset' } }} />
        </Providers>
      </body>
    </html>
  );
}
