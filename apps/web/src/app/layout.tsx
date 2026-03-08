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
  description: "나만의 ETF 포트폴리오를 그리다",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <VersionCheck />
        <Providers>
          {children}
          <Footer />
          <Toaster position="top-center" theme="dark" toastOptions={{ style: { width: 'fit-content', minWidth: 'unset' } }} />
        </Providers>
      </body>
    </html>
  );
}
