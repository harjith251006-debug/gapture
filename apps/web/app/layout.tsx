import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gapture",
  description: "FT-07 Regulatory Compliance Intelligence Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
