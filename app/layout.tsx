import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/context";
import { getDictionary, getLocale } from "@/lib/i18n";

const interTight = Inter_Tight({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Absolute base for the OG image URL in link previews. Set NEXT_PUBLIC_SITE_URL in production.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "JR2 Desa Restu", template: "%s · JR2 Desa Restu" },
  description: "Yuran pondok pengawal Jalan Restu 2: semak status rumah anda dan hantar bukti bayaran.",
  openGraph: {
    title: "JR2 Desa Restu",
    description: "Semak status rumah anda dan hantar bukti bayaran yuran pondok pengawal.",
    locale: "ms_MY",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050a1a",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dictionary = await getDictionary();

  return (
    <html
      lang={locale}
      className={`${interTight.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <I18nProvider locale={locale} dictionary={dictionary}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
