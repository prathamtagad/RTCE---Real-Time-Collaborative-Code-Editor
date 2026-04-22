import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RTCE — Real-Time Collaborative Code Editor",
  description:
    "Code together in real-time with live cursors, chat, and version history. Powered by CRDTs.",
  keywords: [
    "collaborative",
    "code editor",
    "real-time",
    "pair programming",
    "CRDT",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen gradient-bg">
        {children}
      </body>
    </html>
  );
}
