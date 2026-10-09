'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import { PlusCircle, BarChart3, LogIn, LogOut, Clock, FileText } from 'lucide-react';

export default function Navbar() {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const user = session?.user;

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
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Mis Avisos para usuarios autenticados */}
          {user && (
            <Link
              href="/mis-avisos"
              data-testid="nav-mis-avisos-link"
              className="inline-flex items-center gap-1.5 text-xs font-display font-semibold uppercase tracking-wider text-petroleo/80 hover:text-petroleo px-3 py-2 rounded-full hover:bg-petroleo/5 border border-petroleo/15 transition"
              title="Gestionar mis avisos publicados"
            >
              <FileText className="w-3.5 h-3.5 text-coral" />
              <span className="hidden sm:inline">Mis Avisos</span>
            </Link>
          )}

          {/* El botón de avisos pendientes y estadísticas se muestra SOLAMENTE para admins cuando están logueados */}
          {isAdmin && (
            <>
              <Link
                href="/#avisos-pendientes"
                data-testid="nav-pending-link"
                className="inline-flex items-center gap-1.5 text-xs font-display font-semibold uppercase tracking-wider text-petroleo hover:text-white bg-arena/80 hover:bg-mostaza border border-mostaza/30 px-3 py-2 rounded-full transition shadow-2xs"
                title="Avisos pendientes de aprobación"
              >
                <Clock className="w-3.5 h-3.5 text-coral" />
                <span className="hidden sm:inline">Avisos Pendientes</span>
              </Link>
              <Link
                href="/admin"
                data-testid="nav-admin-link"
                className="inline-flex items-center gap-1.5 text-xs font-display font-semibold uppercase tracking-wider text-petroleo/80 hover:text-petroleo px-3 py-2 rounded-full hover:bg-petroleo/5 border border-petroleo/15 transition"
              >
                <BarChart3 className="w-3.5 h-3.5 text-coral" />
                <span className="hidden md:inline">Panel Admin</span>
              </Link>
            </>
          )}

          {/* Estado de autenticación */}
          {user ? (
            <div className="flex items-center gap-2 bg-white/70 border border-petroleo/10 rounded-full py-1 px-1.5 sm:px-2 shadow-2xs">
              {/* Avatar */}
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name || 'Usuario'}
                  className="w-7 h-7 rounded-full object-cover border border-petroleo/15 shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-arena text-petroleo font-bold text-xs flex items-center justify-center border border-petroleo/15 shrink-0">
                  {(user.name?.[0] || user.email?.[0] || 'U').toUpperCase()}
                </div>
              )}

              {/* Nombre y Onboarding status */}
              <div className="hidden md:flex flex-col text-left pr-1">
                <span className="text-xs font-semibold text-petroleo leading-tight truncate max-w-[120px]">
                  {user.name?.split(' ')[0] || user.email?.split('@')[0]}
                </span>
                {!user.isOnboarded && (
                  <Link
                    href="/onboarding"
                    className="text-[10px] text-coral hover:underline font-medium leading-tight flex items-center gap-0.5"
                  >
                    <span>Completar perfil</span>
                  </Link>
                )}
              </div>

              {/* Botón cerrar sesión */}
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                title="Cerrar sesión"
                className="p-1 text-secondary hover:text-coral rounded-full hover:bg-petroleo/5 transition ml-0.5"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : status !== 'loading' ? (
            <button
              onClick={() => signIn('google')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-petroleo/80 hover:text-petroleo px-3 sm:px-3.5 py-2 rounded-full hover:bg-petroleo/5 border border-petroleo/15 transition"
            >
              <LogIn className="w-3.5 h-3.5 text-coral" />
              <span>Ingresar</span>
            </button>
          ) : null}

          {/* Publicar aviso */}
          <Link
            href="/publicar"
            className="btn-criana-primary inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Publicar Aviso</span>
            <span className="sm:hidden">Publicar</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
