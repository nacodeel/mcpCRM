import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css'; // Global styles
import { ToastProvider } from '@/components/ui';
import { CRMProvider } from '@/context/crm-context';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Mini CRM',
  description: 'Минималистичная CRM для контактов и сделок для AI-агентов',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning className="font-sans antialiased text-text-primary bg-background min-h-screen">
        <ToastProvider>
          <CRMProvider>
            {children}
          </CRMProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
