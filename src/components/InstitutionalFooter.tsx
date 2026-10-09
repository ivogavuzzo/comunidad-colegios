import React from 'react';
import Image from 'next/image';
import { Heart, ExternalLink, Sparkles } from 'lucide-react';

export const INSTITUTIONAL_FOOTER_TEXT = 'Esta comunidad es una iniciativa de Criana';

export default function InstitutionalFooter() {
  return (
    <footer className="bg-petroleo text-white border-t border-petroleo-light mt-auto py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        {/* Brand identity column */}
        <div className="flex flex-col items-center md:items-start space-y-3 text-center md:text-left">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center p-1.5 border border-white/20">
              <Image
                src="/brand/criana-casita.svg"
                alt="Criana"
                width={24}
                height={24}
                className="w-6 h-6 object-contain brightness-0 invert"
              />
            </div>
            <div>
              <span className="font-serif text-lg font-bold tracking-tight text-white block">
                Comunidades <span className="italic font-normal text-coral-light">de Colegios</span>
              </span>
              <span className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-mostaza-light block">
                by Criana
              </span>
            </div>
          </div>

          <p className="text-sm font-display uppercase tracking-widest font-semibold text-coral-light flex items-center gap-2">
            <Heart className="w-3.5 h-3.5 fill-coral text-coral" />
            <span>{INSTITUTIONAL_FOOTER_TEXT}</span>
          </p>

          <p className="text-xs text-white/70 max-w-lg leading-relaxed font-sans">
            Conectamos a familias escolares de CABA y GBA para facilitar recomendaciones de
            confianza, cuidado infantil profesional y apoyo a la comunidad educativa.
          </p>
        </div>

        {/* Links column */}
        <div className="flex flex-col items-center md:items-end gap-4">
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-display uppercase tracking-wider font-semibold">
            <a
              href="https://www.criana.com.ar"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-coral text-white transition-all transform hover:-translate-y-0.5 border border-white/15"
            >
              <span>Conocé Criana</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <a
              href="/admin"
              className="text-white/70 hover:text-white transition-colors"
            >
              Panel Admin
            </a>

            <a
              href="mailto:contacto@criana.com.ar"
              className="text-white/70 hover:text-white transition-colors"
            >
              Contacto
            </a>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-white/50 font-sans">
            <Sparkles className="w-3 h-3 text-mostaza" />
            <span>Cuidado boutique, pedagógico y humano</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-white/50 gap-3 font-sans">
        <p>© {new Date().getFullYear()} Comunidades de Colegios. Todos los derechos reservados.</p>
        <p className="italic font-serif">«El cuidado que tu peque merece»</p>
      </div>
    </footer>
  );
}
