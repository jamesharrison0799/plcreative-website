import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthControls from "@/components/AuthControls";
import { createClient } from "@/lib/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('site_settings')
    .select('site_name, site_description')
    .eq('id', 1)
    .single<{ site_name: string; site_description: string }>()

  return {
    title: data?.site_name ?? 'PLCreative',
    description: data?.site_description ?? 'PLCreative',
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="fixed top-0 right-0 p-4 z-10">
          <AuthControls />
        </header>
        {children}
      </body>
    </html>
  );
}
