// frontend/app/layout.js
'use client';

import './globals.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ThemeProvider } from '../components/ThemeProvider';

export default function RootLayout({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        staleTime: 1000 * 60 * 2, // 2 mins
      },
    },
  }));

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>TransHub - All-in-One Logistics Operating Platform</title>
        <meta name="description" content="Move More. Deliver What's Next. Commercial Multi-Tenant Transport Management & Logistics Operating Platform" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('transporter_theme');
                  var theme = saved === 'dark' ? 'dark' : 'light';
                  var root = document.documentElement;
                  if (theme === 'dark') {
                    root.classList.add('dark');
                    root.classList.remove('light');
                    root.style.colorScheme = 'dark';
                  } else {
                    root.classList.remove('dark');
                    root.classList.add('light');
                    root.style.colorScheme = 'light';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-white text-slate-900 dark:bg-[#070C18] dark:text-slate-100 transition-colors duration-200 antialiased min-h-screen">
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
