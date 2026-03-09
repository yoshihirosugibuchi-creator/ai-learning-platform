import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/contexts/UserContext";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import ClientOnly from "@/components/ClientOnly";
import ErrorBoundary from "@/components/auth/ErrorBoundary";
import { ToastProvider } from "@/components/providers/ToastProvider";
import ServiceWorkerRegistration from "@/components/pwa/ServiceWorkerRegistration";
import NativeAppDetector from "@/components/native/NativeAppDetector";
import BiometricAuthGate from "@/components/native/BiometricAuthGate";

// 開発環境でのみ認証エラー回復ヘルパーとコンソールフィルターを読み込み
if (process.env.NODE_ENV === 'development') {
  import("@/lib/dev-auth-helper");
  import("@/lib/console-filters");
}

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AI Learning Enterprise - AIパーソナライズ学習プラットフォーム",
  description: "AI powered personalized learning platform",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ALE学習',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#4f46e5',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body
        className={`${inter.variable} ${notoSansJP.variable} antialiased min-h-screen bg-background font-sans`}
      >
        <ServiceWorkerRegistration />
        <NativeAppDetector />
        <ErrorBoundary>
          <ClientOnly fallback={<div>Loading...</div>}>
            <QueryProvider>
              <AuthProvider>
                <BiometricAuthGate>
                  <UserProvider>
                    <ToastProvider>
                      {children}
                    </ToastProvider>
                  </UserProvider>
                </BiometricAuthGate>
              </AuthProvider>
            </QueryProvider>
          </ClientOnly>
        </ErrorBoundary>
      </body>
    </html>
  );
}
