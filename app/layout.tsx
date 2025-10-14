import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/contexts/UserContext";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import ClientOnly from "@/components/ClientOnly";
import ErrorBoundary from "@/components/auth/ErrorBoundary";

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
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${inter.variable} ${notoSansJP.variable} antialiased min-h-screen bg-background font-sans`}
      >
        <ErrorBoundary>
          <ClientOnly fallback={<div>Loading...</div>}>
            <QueryProvider>
              <AuthProvider>
                <UserProvider>
                  {children}
                </UserProvider>
              </AuthProvider>
            </QueryProvider>
          </ClientOnly>
        </ErrorBoundary>
      </body>
    </html>
  );
}
