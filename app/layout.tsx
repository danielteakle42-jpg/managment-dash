import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./creator-refresh.css";
import "./creator-simplify.css";
import "./creator-tool-pages.css";
import "./admin-simplify.css";
import "./manager-admin-navigation.css";
import "./role-experience.css";
import "./leaderboard-upgrade.css";
import RoleExperience from "./role-experience";
import LeaderboardEnhancements from "./leaderboard-enhancements";
import RoleViewSync from "./role-view-sync";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Platinum Pulse × VOID | Creator Hub",
  description: "Creator performance, leaderboards, incentives and campaigns for Platinum Pulse and VOID.",
  manifest: "/manifest.webmanifest",
  themeColor: "#020914",
  appleWebApp: { capable: true, title: "Creator Hub", statusBarStyle: "black-translucent" },
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }, { url: "/app-icon.png", sizes: "512x512", type: "image/png" }],
    shortcut: "/favicon.png",
    apple: "/apple-touch-icon.png",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased role-nav-pending`}
      >
        {children}
        <RoleExperience />
        <LeaderboardEnhancements />
        <RoleViewSync />
      </body>
    </html>
  );
}
