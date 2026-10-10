import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import InstitutionalFooter from '@/components/InstitutionalFooter';
import AuthProvider from '@/components/AuthProvider';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Comunidad de Colegios — Directorio Escolar AMBA',
  description:
    'Directorio comunitario boutique entre familias escolares de CABA y Gran Buenos Aires para recomendar y ofrecer servicios de confianza.',
  icons: {
    icon: [
      { url: '/brand/criana-c.svg', type: 'image/svg+xml' },
      { url: '/brand/criana-c.png', type: 'image/png' },
    ],
    shortcut: '/brand/criana-c.svg',
    apple: '/brand/criana-c.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full">
      <head>
        <link rel="icon" href="/brand/criana-c.svg" type="image/svg+xml" />
        <link rel="icon" href="/brand/criana-c.png" type="image/png" />
        <link rel="shortcut icon" href="/brand/criana-c.svg" />
        <link rel="apple-touch-icon" href="/brand/criana-c.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Josefin+Sans:wght@300..700&family=Raleway:wght@300..600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex flex-col min-h-full text-petroleo antialiased selection:bg-coral/20 selection:text-petroleo">
        <AuthProvider>
          {/* Barra de navegación superior con efecto Glassmorphism */}
          <Navbar />

          {/* Contenido Principal */}
          <main className="flex-1 flex flex-col">{children}</main>

          {/* Pie de página institucional oficial Criana con Disclaimer legal */}
          <InstitutionalFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
