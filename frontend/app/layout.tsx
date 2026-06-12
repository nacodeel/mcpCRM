import type { Metadata } from 'next';
import './globals.css'; // Global styles
import { ToastProvider } from '@/components/ui';
import { CRMProvider } from '@/context/crm-context';

export const metadata: Metadata = {
  title: 'Mini CRM',
  description: 'Минималистичная CRM для контактов и сделок для AI-агентов',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-[#F9F9F8] font-sans text-[#1A1A1A] antialiased min-h-screen" suppressHydrationWarning>
        <ToastProvider>
          <CRMProvider>
            {children}
          </CRMProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

