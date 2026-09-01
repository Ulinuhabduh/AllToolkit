import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const fontSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'All Tools Kit',
    template: '%s | AllTools',
  },
  description:
    'Free client-side browser tools: Merge & Edit PDF, Remove Background, Image Enhancer, File Converter, Developer Tools, Design Builders, and 35+ utilities. Fast, privacy-safe, zero server upload.',
  keywords: [
    'all tools',
    'merge pdf',
    'edit pdf',
    'split pdf',
    'remove background',
    'image enhancer',
    'pdf tools',
    'file converter',
    'qr code generator',
    'json formatter',
    'client-side tools',
  ],
  icons: {
    icon: '/icon.png',
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={fontSans.variable}>
      <body className="font-sans antialiased min-h-screen flex flex-col relative overflow-x-hidden">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {/* Ambient Glassmorphism Glowing Orbs Background */}
          <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
            {/* Top-left Indigo / Purple Orb */}
            <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-indigo-500/20 via-purple-500/15 to-transparent blur-[100px] animate-float-slow" />
            
            {/* Top-right Pink / Rose Orb */}
            <div className="absolute -top-20 -right-40 w-[550px] h-[550px] rounded-full bg-gradient-to-bl from-pink-500/20 via-rose-500/10 to-transparent blur-[120px] animate-float-reverse" />
            
            {/* Center-bottom Cyan / Emerald Orb */}
            <div className="absolute top-[45%] left-[20%] w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-cyan-500/15 via-indigo-500/10 to-emerald-500/10 blur-[140px] animate-pulse-subtle" />
            
            {/* Subtle Grid Layer */}
            <div className="absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]" />
          </div>

          <Navbar />
          <main className="flex-1 relative z-10">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
