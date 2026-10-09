'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { PlusCircle, BarChart3 } from 'lucide-react';

export default function Navbar() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  return (
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
              Comunidad <span className="italic font-normal text-coral">de Colegios</span>
            </span>
          </div>
        </Link>

        {/* Botones de acción de cabecera */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* El botón estadísticas se muestra SOLAMENTE para admins cuando están logueados */}
          {isAdmin && (
            <Link
              href="/admin"
              data-testid="nav-admin-link"
              className="inline-flex items-center gap-1.5 text-xs font-display font-semibold uppercase tracking-wider text-petroleo/80 hover:text-petroleo px-3.5 py-2 rounded-full hover:bg-petroleo/5 border border-petroleo/15 transition"
            >
              <BarChart3 className="w-3.5 h-3.5 text-coral" />
              <span>Estadísticas</span>
            </Link>
          )}

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
  );
}
