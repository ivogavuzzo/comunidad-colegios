'use client';

import React from 'react';
import Image from 'next/image';
import {
  MessageCircle,
  Mail,
  Globe,
  Sparkles,
  School as SchoolIcon,
  CheckCircle,
} from 'lucide-react';

export interface ListingCardProps {
  listing: {
    id: string;
    title: string;
    description: string;
    aiCorrectedTitle?: string | null;
    aiCorrectedDesc?: string | null;
    status: string;
    isPermanentFeatured?: boolean;
    pinnedPosition?: number | null;
    category?: { id: string; name: string; slug: string } | null;
    subcategory?: { id: string; name: string; slug: string } | null;
    school?: {
      id: string;
      nombre: string;
      domicilio: string;
      localidad: string;
      departamento: string;
    } | null;
    whatsapp?: string | null;
    email?: string | null;
    webUrl?: string | null;
    images?: { id: string; url: string }[];
  };
}

export default function ListingCard({ listing }: ListingCardProps) {
  const isCrianaFeatured =
    listing.isPermanentFeatured || listing.id === 'criana-official-featured';

  const displayTitle = listing.aiCorrectedTitle || listing.title;
  const displayDescription = listing.aiCorrectedDesc || listing.description;

  const trackClick = async (channel: 'WHATSAPP' | 'EMAIL' | 'WEB') => {
    try {
      fetch('/api/track/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id, channel }),
      }).catch(() => {});
    } catch {}
  };

  const cleanWhatsappNumber = (phone: string) => {
    return phone.replace(/[^\d]/g, '');
  };

  return (
    <article
      data-testid="listing-card"
      data-featured={isCrianaFeatured ? 'true' : 'false'}
      className={`rounded-[24px] transition-all duration-300 flex flex-col justify-between overflow-hidden ${
        isCrianaFeatured
          ? 'bg-gradient-to-b from-[#FCFBF8] via-white to-[#F6F0E3]/40 border-2 border-mostaza/50 shadow-md ring-2 ring-mostaza/20'
          : 'bg-white border border-petroleo/10 shadow-criana hover:shadow-criana-hover hover:-translate-y-1'
      }`}
    >
      {/* Featured Header Badge for Criana Official */}
      {isCrianaFeatured && (
        <div className="bg-petroleo text-white px-5 py-2.5 text-xs font-display font-bold tracking-[0.12em] uppercase flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-mostaza flex items-center justify-center p-0.5">
              <Image
                src="/brand/criana-casita.svg"
                alt="Criana"
                width={14}
                height={14}
                className="w-3.5 h-3.5 object-contain brightness-0 invert"
              />
            </div>
            <span>Recomendado por Criana • Cuidado Infantil</span>
          </div>
          <span className="bg-white/15 text-white px-2.5 py-0.5 rounded-full text-[10px] tracking-widest font-display">
            Oficial
          </span>
        </div>
      )}

      <div className="p-6 sm:p-7 flex-1 flex flex-col">
        {/* Category & Tags Header */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {listing.category && (
            <span className="px-3 py-1 bg-arena/80 text-petroleo text-xs font-display font-semibold uppercase tracking-wider rounded-full">
              {listing.category.name}
            </span>
          )}
          {listing.subcategory && (
            <span className="px-3 py-1 bg-menta/60 text-secondary text-xs font-display font-semibold uppercase tracking-wider rounded-full">
              {listing.subcategory.name}
            </span>
          )}
          {isCrianaFeatured && (
            <span className="px-3 py-1 bg-coral/15 text-coral text-xs font-display font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-coral" />
              <span>Verificado</span>
            </span>
          )}
        </div>

        {/* Title in Fraunces Serif */}
        <h3 className="font-serif text-xl sm:text-2xl font-bold text-petroleo leading-snug mb-3">
          {displayTitle}
        </h3>

        {/* Associated School (if not Criana global profile) */}
        {listing.school && (
          <div className="flex items-center gap-2 text-xs text-secondary mb-4 bg-arena/40 px-3.5 py-2 rounded-xl border border-petroleo/5">
            <SchoolIcon className="w-4 h-4 text-coral flex-shrink-0" />
            <span className="font-medium truncate text-petroleo">{listing.school.nombre}</span>
            <span className="text-petroleo/30">•</span>
            <span className="text-secondary truncate">{listing.school.domicilio}</span>
          </div>
        )}

        {/* Description */}
        <p className="font-sans text-sm text-petroleo/80 leading-relaxed mb-6 flex-1 line-clamp-4">
          {displayDescription}
        </p>

        {/* Contact Actions with Pill Shape */}
        <div className="pt-5 border-t border-petroleo/10 flex flex-wrap items-center gap-2.5 mt-auto">
          {listing.whatsapp && (
            <a
              href={`https://wa.me/${cleanWhatsappNumber(listing.whatsapp)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick('WHATSAPP')}
              className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-display font-bold uppercase tracking-wider shadow-xs transition-all transform hover:-translate-y-0.5"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp</span>
            </a>
          )}

          {listing.email && (
            <a
              href={`mailto:${listing.email}`}
              onClick={() => trackClick('EMAIL')}
              className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 bg-arena/80 hover:bg-arena text-petroleo rounded-full text-xs font-display font-semibold uppercase tracking-wider border border-petroleo/15 transition-all transform hover:-translate-y-0.5"
            >
              <Mail className="w-3.5 h-3.5 text-secondary" />
              <span>Email</span>
            </a>
          )}

          {listing.webUrl && (
            <a
              href={listing.webUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick('WEB')}
              className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 bg-arena/80 hover:bg-arena text-petroleo rounded-full text-xs font-display font-semibold uppercase tracking-wider border border-petroleo/15 transition-all transform hover:-translate-y-0.5"
            >
              <Globe className="w-3.5 h-3.5 text-secondary" />
              <span>Web</span>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
