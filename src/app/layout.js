import { Toaster } from 'sonner';
import './globals.css';

export const metadata = {
    title: 'Fomo Ads Metrics',
    description: 'Dashboard de metricas de Meta Ads — by FOMO',
};

export default function RootLayout({ children }) {
    return (
        <html lang="es">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
            </head>
            <body className="antialiased">
                {children}
                <Toaster expand position="top-right" />
            </body>
        </html>
    );
}
