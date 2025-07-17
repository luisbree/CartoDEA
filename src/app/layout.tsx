
import type { Metadata } from 'next';
import { Encode_Sans, Encode_Sans_Condensed } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

const encodeSans = Encode_Sans({
  subsets: ['latin'],
  variable: '--font-encode-sans',
});

const encodeSansCondensed = Encode_Sans_Condensed({
  subsets: ['latin'],
  weight: '500',
  variable: '--font-encode-sans-condensed',
});


export const metadata: Metadata = {
  title: 'Map Explorer',
  description: 'Explore the world with an interactive map.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${encodeSans.variable} ${encodeSansCondensed.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
