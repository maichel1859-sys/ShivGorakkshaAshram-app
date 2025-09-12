import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
// PWA install prompt is now handled by UniversalPWAPrompt in AppProviders
import { TopProgressBar } from "@/components/loading";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Shivgoraksha Ashram Management System",
    template: "%s | Shivgoraksha Ashram",
  },
  description:
    "Complete management system for Shivgoraksha Ashram - Appointments, Consultations, Spiritual Remedies, and Queue Management",
  keywords: [
    "shivgoraksha ashram",
    "spiritual appointments",
    "consultations",
    "remedies",
    "ashram management",
    "spiritual guidance",
  ],
  authors: [{ name: "Shivgoraksha Ashram Management System" }],
  creator: "Shivgoraksha Ashram",
  publisher: "Shivgoraksha Ashram",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    title: "Shivgoraksha Ashram Management System",
    description:
      "Complete management system for Shivgoraksha Ashram - Appointments, Consultations, Spiritual Remedies, and Queue Management",
    siteName: "Shivgoraksha Ashram",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shivgoraksha Ashram Management System",
    description:
      "Complete management system for Shivgoraksha Ashram - Appointments, Consultations, Spiritual Remedies, and Queue Management",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-32x32.svg", sizes: "32x32", type: "image/svg+xml" },
      { url: "/icons/icon-192x192.svg", sizes: "192x192", type: "image/svg+xml" },
    ],
    shortcut: "/icons/icon-192x192.svg",
    apple: [
      { url: "/icons/icon-180x180.svg", sizes: "180x180", type: "image/svg+xml" },
      { url: "/icons/icon-152x152.svg", sizes: "152x152", type: "image/svg+xml" },
    ],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Shivgoraksha Ashram",
    "mobile-web-app-capable": "yes",
    "msapplication-config": "/browserconfig.xml",
    "msapplication-TileColor": "hsl(var(--background))",
    "msapplication-tap-highlight": "no",
    "format-detection": "telephone=no",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "hsl(var(--background))" },
    { media: "(prefers-color-scheme: dark)", color: "hsl(var(--background))" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AppProviders>
          <TopProgressBar />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
