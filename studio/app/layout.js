import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';

import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

import './globals.css';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-sans',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-ibm-plex-mono',
});

export const metadata = {
  title: 'Devboy Studio',
  description: 'Local configuration dashboard for Devboy backends',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>
      <body className="min-h-svh">
        <TooltipProvider>
          {children}
          <Toaster richColors closeButton position="bottom-right" theme="light" />
        </TooltipProvider>
      </body>
    </html>
  );
}
