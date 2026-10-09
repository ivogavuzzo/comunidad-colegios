import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const LEGAL_DISCLAIMER_TEXT =
  'Comunidades de Colegios es un espacio comunitario de encuentro entre familias escolares. Los servicios ofrecidos son responsabilidad exclusiva de sus anunciantes. Criana no interviene en la contratación ni se responsabiliza por los acuerdos entre partes.';

export default function LegalBanner() {
  return (
    <aside
      role="note"
      aria-label="Aviso legal de responsabilidad"
      className="bg-arena/70 border-b border-petroleo/10 text-petroleo text-xs sm:text-xs py-2 px-4 shadow-xs"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-center leading-relaxed">
        <ShieldAlert className="w-3.5 h-3.5 text-mostaza flex-shrink-0" aria-hidden="true" />
        <span className="font-sans font-medium opacity-90">{LEGAL_DISCLAIMER_TEXT}</span>
      </div>
    </aside>
  );
}
