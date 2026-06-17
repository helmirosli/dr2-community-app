import type { Metadata, Viewport } from "next";
import { Lexend, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { LayoutWrapper } from "./layout-wrapper";
import { I18nProvider } from "@/lib/i18n/context";
import { getDictionary, getLocale } from "@/lib/i18n";

const lexend = Lexend({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "DR2 Community Fee System",
  description: "Resident fee dashboard and public payment submission form.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
      className={`${lexend.variable} ${sourceSans.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <I18nProvider locale={locale} dictionary={dictionary}>
          <LayoutWrapper>{children}</LayoutWrapper>
        </I18nProvider>
      </body>
    </html>
  );
}
