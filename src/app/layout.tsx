import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import LegalBanner from '@/components/LegalBanner';
import InstitutionalFooter from '@/components/InstitutionalFooter';
import AuthProvider from '@/components/AuthProvider';
import Image from 'next/image';
import Link from 'next/link';
import { PlusCircle, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Comunidades de Colegios (by Criana) — Directorio Escolar AMBA',
  description:
    'Directorio comunitario boutique entre familias escolares de CABA y Gran Buenos Aires para recomendar y ofrecer servicios de confianza.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full">
      <head>
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
          {/* Banner Legal Obligatorio en la cabecera */}
          <LegalBanner />

          {/* Barra de navegación superior con efecto Glassmorphism */}
          <header className="bg-ivory/80 backdrop-blur-md border-b border-petroleo/10 sticky top-0 z-40 transition-all">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
              {/* Logo e Isotipo Criana */}
              <Link href="/" className="flex items-center gap-3 group">
                <div className="relative w-10 h-10 rounded-2xl bg-arena flex items-center justify-center p-2 border border-petroleo/10 shadow-xs group-hover:scale-105 transition-transform">
                  <Image
                    src="/brand/criana-casita.svg"
                    alt="Criana"
                    width={26}
                    height={26}
                    className="w-6 h-6 object-contain"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-serif font-bold text-petroleo text-lg sm:text-xl leading-tight tracking-tight">
                    Comunidades <span className="italic font-normal text-coral">de Colegios</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-mostaza font-display font-bold uppercase tracking-[0.18em]">
                      Iniciativa Criana
                    </span>
                    <Sparkles className="w-2.5 h-2.5 text-mostaza" />
                  </div>
                </div>
              </Link>

              {/* Botones de acción de cabecera */}
              <div className="flex items-center gap-3 sm:gap-4">
                <Link
                  href="/admin"
                  className="hidden md:inline-flex items-center text-xs font-display font-semibold uppercase tracking-wider text-petroleo/70 hover:text-petroleo px-3 py-2 rounded-full hover:bg-petroleo/5 transition"
                >
                  Estadísticas
                </Link>

                <Link
                  href="/publicar"
                  className="btn-criana-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Publicar Aviso</span>
                </Link>
              </div>
            </div>
          </header>

          {/* Contenido Principal */}
          <main className="flex-1 flex flex-col">{children}</main>

          {/* Pie de página institucional oficial Criana */}
          <InstitutionalFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
