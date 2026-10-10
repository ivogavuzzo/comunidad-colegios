import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShieldAlert, ExternalLink, Heart } from 'lucide-react';
import { LEGAL_DISCLAIMER_TEXT } from './LegalBanner';

// Official institutional notice (replaces legacy 'by Criana' with 'es una iniciativa de Criana')
export const INSTITUTIONAL_FOOTER_TEXT = 'Esta comunidad es una iniciativa de Criana';

export default function InstitutionalFooter() {
  return (
    <footer className="bg-petroleo text-white border-t border-petroleo-light mt-auto pt-10 pb-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Banner de Responsabilidad Comunitaria (Legal Disclaimer) movido al footer */}
        <aside
          role="note"
          aria-label="Aviso legal de responsabilidad comunitaria"
          className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 text-white/80 text-xs leading-relaxed"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-mostaza flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="font-sans">
              <span className="font-semibold text-white">Comunidad de Colegios</span>{' '}
              es un espacio comunitario de encuentro entre familias escolares. Los servicios
              ofrecidos son responsabilidad exclusiva de sus anunciantes. Criana no interviene en la
              contratación ni se responsabiliza por los acuerdos entre partes.
            </p>
          </div>
        </aside>

        {/* Bloque Principal del Footer */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-2">
          {/* Identidad de marca singular */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-2">
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8 rounded-xl bg-arena flex items-center justify-center p-1.5 border border-white/20 shadow-2xs">
                <Image
                  src="/brand/criana-c.svg"
                  alt="Criana"
                  width={22}
                  height={22}
                  className="w-5.5 h-5.5 object-contain"
                />
              </div>
              <span className="font-serif text-lg font-bold tracking-tight text-white">
                Comunidad <span className="italic font-normal text-coral-light">de Colegios</span>
              </span>
            </div>

            <p className="text-xs text-white/70 max-w-md font-sans">
              Conectamos a familias escolares de CABA y GBA para facilitar recomendaciones de
              confianza, cuidado infantil y apoyo mutuo entre colegios.
            </p>
          </div>

          {/* Enlaces y Acceso Admin a la derecha */}
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3.5 sm:gap-5 text-xs font-display uppercase tracking-wider font-semibold">
            <Link
              href="/terminos"
              className="text-white/70 hover:text-white transition-colors"
            >
              Términos
            </Link>

            <Link
              href="/privacidad"
              className="text-white/70 hover:text-white transition-colors"
            >
              Privacidad
            </Link>

            <a
              href="https://www.criana.com.ar"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-coral text-white transition-all transform hover:-translate-y-0.5 border border-white/15"
            >
              <span>Conocé Criana</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <a
              href="mailto:contacto@criana.com.ar"
              className="text-white/70 hover:text-white transition-colors"
            >
              Contacto
            </a>

            <Link
              href="/admin"
              data-testid="admin-access-link"
              className="inline-flex items-center gap-1 text-white/70 hover:text-white px-3 py-1.5 rounded-full hover:bg-white/10 border border-white/10 transition-colors"
            >
              Acceso Admin
            </Link>
          </div>
        </div>

        {/* Barra inferior: Iniciativa Criana con logo cliqueable y enlaces legales */}
        <div className="border-t border-white/10 pt-6 flex flex-col lg:flex-row items-center justify-between text-xs text-white/60 gap-4 font-sans">
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-3 gap-y-1 text-center lg:text-left">
            <span>© {new Date().getFullYear()} Comunidad de Colegios.</span>
            <span className="hidden sm:inline opacity-40">•</span>
            <Link href="/terminos" className="hover:text-white transition-colors underline-offset-2 hover:underline">
              Términos y Condiciones
            </Link>
            <span className="hidden sm:inline opacity-40">•</span>
            <Link href="/privacidad" className="hover:text-white transition-colors underline-offset-2 hover:underline">
              Política de Privacidad
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs text-white/80 font-sans">
              Comunidad de Colegios es una iniciativa de
            </span>
            <a
              href="https://www.criana.com.ar"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center hover:opacity-90 transition-opacity"
              title="Visitar Criana"
            >
              <Image
                src="/brand/criana-logo-blanco.png"
                alt="Criana"
                width={85}
                height={26}
                className="h-5 w-auto object-contain"
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
