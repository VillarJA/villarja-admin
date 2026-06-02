import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Villar JA — Admin Portal e-CF',
  description: 'Panel de administración para facturación electrónica e-CF',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
