'use client';

import React from 'react';
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
      // Fire-and-forget silent tracking
      fetch('/api/track/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id, channel }),
      }).catch(() => {
        // silent fail
      });
    } catch {
      // silent
    }
  };

  const cleanWhatsappNumber = (phone: string) => {
    return phone.replace(/[^\d]/g, '');
  };

  return (
    <article
      data-testid="listing-card"
      data-featured={isCrianaFeatured ? 'true' : 'false'}
      className={`rounded-2xl transition-all duration-200 flex flex-col justify-between overflow-hidden ${
        isCrianaFeatured
          ? 'bg-gradient-to-b from-rose-50/70 via-white to-rose-50/30 border-2 border-rose-400 shadow-md ring-2 ring-rose-300/30'
          : 'bg-white border border-slate-200/90 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Featured Header Badge if Criana */}
      {isCrianaFeatured && (
        <div className="bg-gradient-to-r from-rose-600 to-rose-500 text-white px-4 py-2 text-xs font-bold tracking-wide uppercase flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Perfil Oficial Criana • Cuidado Infantil Verificado</span>
          </div>
          <span className="bg-white/20 px-2 py-0.5 rounded text-[10px]">
            Destacado Permanente
          </span>
        </div>
      )}

      <div className="p-5 sm:p-6 flex-1 flex flex-col">
        {/* Category & Tags Header */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {listing.category && (
            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg">
              {listing.category.name}
            </span>
          )}
          {listing.subcategory && (
            <span className="px-2.5 py-1 bg-slate-100/70 text-slate-600 text-xs rounded-lg">
              {listing.subcategory.name}
            </span>
          )}
          {isCrianaFeatured && (
            <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs font-semibold rounded-md flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-rose-600" />
              <span>Verificado</span>
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-slate-900 leading-snug mb-2">
          {displayTitle}
        </h3>

        {/* Associated School (if not Criana global profile) */}
        {listing.school && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-3 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
            <SchoolIcon className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
            <span className="font-medium truncate">{listing.school.nombre}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500 truncate">{listing.school.domicilio}</span>
          </div>
        )}

        {/* Description */}
        <p className="text-sm text-slate-600 leading-relaxed mb-4 flex-1 line-clamp-4">
          {displayDescription}
        </p>

        {/* Contact Actions */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2 mt-auto">
          {listing.whatsapp && (
            <a
              href={`https://wa.me/${cleanWhatsappNumber(listing.whatsapp)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick('WHATSAPP')}
              className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp</span>
            </a>
          )}

          {listing.email && (
            <a
              href={`mailto:${listing.email}`}
              onClick={() => trackClick('EMAIL')}
              className="inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs sm:text-sm font-medium transition"
            >
              <Mail className="w-4 h-4 text-slate-600" />
              <span>Email</span>
            </a>
          )}

          {listing.webUrl && (
            <a
              href={listing.webUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick('WEB')}
              className="inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs sm:text-sm font-medium transition"
            >
              <Globe className="w-4 h-4 text-slate-600" />
              <span>Web</span>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
