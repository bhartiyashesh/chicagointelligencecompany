import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CIC — Chicago Intelligence Company",
  description: "AI-powered VC analysis and M&A due diligence",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
