import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VeeLion Frontend Assessment",
  description: "Task dashboard and activity feed modules",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
