import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: {
    default: 'All-in-One Online Toolkit',
    template: '%s | AllTools',
  },
  description:
    'All-in-one platform: Remove Background, Image Enhancer, File Converter, PDF Tools, JSON Formatter, QR Generator, and 30+ free tools. Everything is processed in your browser.',
  keywords: ['remove background', 'image enhancer', 'pdf tools', 'file converter', 'qr code', 'json formatter'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased min-h-screen flex flex-col`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
