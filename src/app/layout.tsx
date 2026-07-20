import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AssessmentForm',
  description: 'Developer Platform Assessment Form',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
