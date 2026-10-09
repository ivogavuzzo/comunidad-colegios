import React from 'react';
import { AlertCircle } from 'lucide-react';

export const LEGAL_DISCLAIMER_TEXT =
  'Comunidades de Colegios es un espacio comunitario de encuentro entre familias escolares. Los servicios ofrecidos son responsabilidad exclusiva de sus anunciantes. Criana no interviene en la contratación ni se responsabiliza por los acuerdos entre partes.';

export default function LegalBanner() {
  return (
    <aside
      role="note"
      aria-label="Aviso legal de responsabilidad"
      className="bg-amber-50 border-b border-amber-200 text-amber-900 text-xs sm:text-sm py-2 px-4 shadow-sm"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-center leading-relaxed">
        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" aria-hidden="true" />
        <span>{LEGAL_DISCLAIMER_TEXT}</span>
      </div>
    </aside>
  );
}
