import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JUMP//CUT",
  description: "Integrated Filmmaking Environment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-ui antialiased">{children}</body>
    </html>
  );
}
