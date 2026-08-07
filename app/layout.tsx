import type { Metadata } from "next";
import { Baloo_2, Quicksand, Figtree } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
});

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["vietnamese", "latin"],
  weight: ["600", "700", "800"],
});

// Organic (khu học sinh) — body Figtree, có subset tiếng Việt.
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin", "latin-ext"], // Figtree không có subset "vietnamese"; latin-ext phủ ký tự tiếng Việt
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Anh ngữ Mrs Uyên",
  description: "Học tiếng Anh cùng cô giáo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${quicksand.variable} ${baloo.variable} ${figtree.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="stylesheet" href="/ds/organic.css" />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
