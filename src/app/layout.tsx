import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Hub · LVRGD",
  description: "One front door for every LVRGD dashboard, hub and tool.",
  icons: {
    // The .ico is first because it is the one every browser asks for by name, and
    // Safari and the new-tab tile take it in preference to the SVG. It carries an
    // opaque light ground, since a single file cannot answer a media query and a
    // transparent black wordmark disappears on a dark tab bar.
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48 64x64 128x128" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-black.png", media: "(prefers-color-scheme: light)" },
      { url: "/favicon-white.png", media: "(prefers-color-scheme: dark)" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "Hub" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  // The one page colour, so the phone's status bar matches the surface it sits on.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#121211" },
  ],
};

/**
 * Applies the stored theme before first paint.
 *
 * Without this the server, which cannot know the preference, renders light and a
 * dark-mode user gets a white flash on every navigation. Inline and synchronous on
 * purpose — it has to run before the body is painted.
 */
const THEME_SCRIPT = `
try {
  var t = localStorage.getItem("hub:theme");
  if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
