import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { QueryProvider } from "@/components/QueryProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.betterbookmark.me"),
  title: {
    default: "A better way to search your bookmark | betterBookmark",
    template: "%s | betterBookmark",
  },
  description:
    "Manage your bookmarks smarter with AI-powered search. Organize, find, and rediscover saved links effortlessly with betterBookmark.",
  keywords: [
    "AI bookmark manager",
    "semantic search bookmarks",
    "smart bookmark tool",
    "organize saved links",
    "AI-powered bookmark search",
    "bookmark organizer",
    "better bookmark management",
  ],
  authors: [{ name: "betterBookmark Team" }],
  category: "Productivity",
  creator: "betterBookmark",
  publisher: "betterBookmark",
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: "/LogoFull.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.betterbookmark.me",
    title: "Semantic Bookmark Manager | Organize & Find Links with AI",
    description:
      "Discover a smarter way to manage your bookmarks. Use AI to semantically search and organize your saved links with ease.",
    siteName: "betterBookmark",
    images: [
      {
        url: "/LogoFull.svg",
        width: 1200,
        height: 630,
        alt: "betterBookmark Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Semantic Bookmark Manager | Organize & Find Links with AI",
    description:
      "Use AI and semantic search to manage and rediscover your bookmarks effortlessly with betterBookmark.",
    images: ["/LogoFull.svg"],
    creator: "@betterBookmark",
    site: "@betterBookmark",
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://www.betterbookmark.me",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`hide-scrollbar antialiased`}>
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
