'use client';

import React from 'react';
import Link from 'next/link';
import {
  MessageCircle,
  Mail,
  Globe,
  School as SchoolIcon,
  User as UserIcon,
  ChevronRight,
  MapPin,
  Tag as TagIcon,
} from 'lucide-react';
import { formatWorkZoneDisplay } from '@/lib/tags';

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
    tags?: Array<{ tag?: { id: string; name: string; slug?: string }; id?: string; name?: string; slug?: string }>;
    workZone?: string | null;
    workNeighborhood?: string | null;
    school?: {
      id: string;
      nombre: string;
      domicilio: string;
      localidad: string;
      departamento: string;
    } | null;
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
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

  const senderName = isCrianaFeatured
    ? 'Criana Oficial'
    : listing.user?.name || listing.user?.email || listing.email || 'Familia de la comunidad';

  const displayTags = (listing.tags || []).map((t) => t.tag?.name || t.name).filter(Boolean);
  const workZoneLabel = formatWorkZoneDisplay(listing.workZone, listing.workNeighborhood);

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
      {/* Cuerpo del tile cliqueable para ir a la página individual del servicio */}
      <Link
        href={`/servicios/${listing.id}`}
        className="p-6 sm:p-7 flex-1 flex flex-col group cursor-pointer focus:outline-hidden"
        title={`Ver detalle de ${displayTitle}`}
      >
        {/* Category, Tags & WorkZone Header */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {displayTags.length > 0 ? (
            displayTags.map((tName, idx) => (
              <span
                key={idx}
                className="px-2.5 py-0.5 bg-arena/80 text-petroleo text-xs font-display font-bold uppercase tracking-wider rounded-full"
              >
                #{tName}
              </span>
            ))
          ) : (
            <>
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
            </>
          )}

          {workZoneLabel && (
            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-display font-medium rounded-full flex items-center gap-1 border border-slate-200">
              <MapPin className="w-3 h-3 text-coral shrink-0" />
              <span>{workZoneLabel}</span>
            </span>
          )}
        </div>

        {/* Imagen adjunta si existe */}
        {listing.images && listing.images.length > 0 && (
          <div className="relative w-full h-44 mb-4 rounded-2xl overflow-hidden bg-arena/30 border border-petroleo/10 shrink-0">
            <img
              src={listing.images[0].url}
              alt={displayTitle}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}

        {/* Title in Fraunces Serif */}
        <h3 className="font-serif text-xl sm:text-2xl font-bold text-petroleo leading-snug mb-3 group-hover:text-coral transition-colors">
          {displayTitle}
        </h3>

        {/* Associated School (if not Criana global profile) */}
        {listing.school && (
          <div className="flex items-center gap-2 text-xs text-secondary mb-2 bg-arena/40 px-3.5 py-2 rounded-xl border border-petroleo/5">
            <SchoolIcon className="w-4 h-4 text-coral shrink-0" />
            <span className="font-medium truncate text-petroleo">
              <span className="font-bold">Colegio:</span> {listing.school.nombre}
            </span>
            <span className="text-petroleo/30">•</span>
            <span className="text-secondary truncate">{listing.school.domicilio}</span>
          </div>
        )}

        {/* Sender Info / Enviado por */}
        <div className="flex items-center gap-2 text-xs text-secondary mb-4 px-1">
          <UserIcon className="w-3.5 h-3.5 text-petroleo/60 shrink-0" />
          <span className="font-medium text-slate-700 truncate">
            <span className="text-petroleo font-bold">Enviado por:</span> {senderName}
          </span>
        </div>

        {/* Description */}
        <p className="font-sans text-sm text-petroleo/80 leading-relaxed mb-6 flex-1 line-clamp-4">
          {displayDescription}
        </p>

        {/* Botón pequeño abajo a la derecha para "Ver más" */}
        <div className="flex justify-end mt-auto pt-3">
          <span className="inline-flex items-center gap-1 text-[11px] font-display font-bold uppercase tracking-wider text-coral bg-coral/10 hover:bg-coral/15 group-hover:bg-coral group-hover:text-white px-3 py-1.5 rounded-full border border-coral/20 transition-all shadow-2xs">
            <span>Ver más</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </Link>

      {/* Contact Actions with Pill Shape */}
      <div className="px-6 pb-6 pt-2 border-t border-petroleo/10 flex flex-wrap items-center gap-2.5 bg-white/50">
        {listing.whatsapp && (
          <a
            href={`https://wa.me/${cleanWhatsappNumber(listing.whatsapp)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.stopPropagation();
              trackClick('WHATSAPP');
            }}
            className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-display font-bold uppercase tracking-wider shadow-xs transition-all transform hover:-translate-y-0.5"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
          </a>
        )}

        {listing.email && (
          <a
            href={`mailto:${listing.email}`}
            onClick={(e) => {
              e.stopPropagation();
              trackClick('EMAIL');
            }}
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
            onClick={(e) => {
              e.stopPropagation();
              trackClick('WEB');
            }}
            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 bg-arena/80 hover:bg-arena text-petroleo rounded-full text-xs font-display font-semibold uppercase tracking-wider border border-petroleo/15 transition-all transform hover:-translate-y-0.5"
          >
            <Globe className="w-3.5 h-3.5 text-secondary" />
            <span>Web</span>
          </a>
        )}
      </div>
    </article>
  );
}
