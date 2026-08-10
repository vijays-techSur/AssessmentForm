import type { Metadata } from 'next';
import './globals.css';
import { AppNav } from '@/components/AppNav';

export const metadata: Metadata = {
  title: 'Developer Platform Assessment',
  description: 'AssessmentForm-Express',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <AppNav />
        {children}
      </body>
    </html>
  );
}
