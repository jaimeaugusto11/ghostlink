import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "GhostLink | Ultra-Private Ephemeral Chat",
  description: "Anonymous, encrypted, and self-destructing communication.",
  manifest: "/manifest.webmanifest",
  themeColor: "#020403",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GhostLink",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </head>
      <body className={`${spaceGrotesk.variable} antialiased`}>
      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-3 md:p-6 relative hide-scrollbar">
        <div className="max-w-4xl mx-auto flex flex-col gap-4 md:gap-6">
        {children}
        </div>
      </main>
      </body>
    </html>
  );
}
