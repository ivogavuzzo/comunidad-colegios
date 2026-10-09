import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import LegalBanner from '@/components/LegalBanner';
import InstitutionalFooter from '@/components/InstitutionalFooter';
import AuthProvider from '@/components/AuthProvider';
import { School, PlusCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Comunidades de Colegios (by Criana) — Directorio Escolar AMBA',
  description:
    'Espacio comunitario de encuentro entre familias escolares de CABA y GBA para compartir y recomendar servicios de confianza.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full">
      <body className="flex flex-col min-h-full bg-slate-50 text-slate-800 font-sans antialiased">
        <AuthProvider>
          {/* Banner Legal Obligatorio en la cabecera */}
          <LegalBanner />

          {/* Barra de navegación superior */}
          <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <a href="/" className="flex items-center gap-2.5 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white shadow-sm shadow-rose-500/20 group-hover:scale-105 transition-transform">
                  <School className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 text-base sm:text-lg leading-tight tracking-tight">
                    Comunidades de Colegios
                  </span>
                  <span className="text-[11px] text-rose-600 font-semibold tracking-wide uppercase">
                    by Criana
                  </span>
                </div>
              </a>

              <div className="flex items-center gap-3 sm:gap-4">
                <a
                  href="/publicar"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Publicar Aviso</span>
                </a>
              </div>
            </div>
          </header>

          {/* Contenido Principal */}
          <main className="flex-1 flex flex-col">{children}</main>

          {/* Pie de página institucional */}
          <InstitutionalFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
