import React from 'react';
import { Heart, ExternalLink } from 'lucide-react';

export const INSTITUTIONAL_FOOTER_TEXT = 'Esta comunidad es una iniciativa de Criana';

export default function InstitutionalFooter() {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-auto py-10 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start space-y-2 text-center md:text-left">
          <div className="flex items-center gap-2 text-white font-semibold text-base sm:text-lg">
            <span>Comunidades de Colegios</span>
            <span className="text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-medium">
              by Criana
            </span>
          </div>
          <p className="text-sm font-medium text-rose-400 flex items-center gap-1.5">
            <Heart className="w-4 h-4 fill-rose-400 text-rose-400 inline" />
            <span>{INSTITUTIONAL_FOOTER_TEXT}</span>
          </p>
          <p className="text-xs text-slate-400 max-w-lg">
            Conectamos a familias escolares de CABA y GBA para facilitar recomendaciones,
            servicios compartidos y apoyo a la comunidad educativa.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
          <a
            href="https://www.criana.com.ar"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
          >
            <span>Conocé Criana</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href="/terminos"
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            Términos y Privacidad
          </a>
          <a
            href="#contacto"
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            Contacto
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-slate-800/80 mt-8 pt-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Comunidades de Colegios. Todos los derechos reservados.
      </div>
    </footer>
  );
}
