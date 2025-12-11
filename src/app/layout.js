import { Inter } from 'next/font/google';
import './globals.css';
import { cn } from '../lib/utils';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'LiftLens Admin',
  description: 'Admin Portal for LiftLens',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={cn('min-h-screen', inter.className)}>{children}</body>
    </html>
  );
}