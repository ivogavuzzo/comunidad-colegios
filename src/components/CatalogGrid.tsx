'use client';

import React from 'react';
import ListingCard, { ListingCardProps } from './ListingCard';
import { PackageOpen, Sparkles, Loader2 } from 'lucide-react';

export interface CatalogGridProps {
  listings: ListingCardProps['listing'][];
  isLoading?: boolean;
  selectedCategorySlug?: string;
  selectedCategoryName?: string;
}

export default function CatalogGrid({
  listings,
  isLoading = false,
  selectedCategorySlug,
  selectedCategoryName,
}: CatalogGridProps) {
  if (isLoading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin mb-3" />
        <p className="text-sm font-medium">Buscando publicaciones de la comunidad...</p>
      </div>
    );
  }

  // Ensure Criana is pinned at index 0 in Cuidado Infantil or when viewing all categories
  const isChildcare = !selectedCategorySlug || selectedCategorySlug === 'cuidado-infantil';
  const displayListings = [...listings];

  if (isChildcare) {
    const crianaIndex = displayListings.findIndex(
      (l) => l.isPermanentFeatured || l.id === 'criana-official-featured'
    );
    if (crianaIndex > 0) {
      const [crianaItem] = displayListings.splice(crianaIndex, 1);
      displayListings.unshift(crianaItem);
    }
  }

  if (displayListings.length === 0) {
    return (
      <div className="py-16 px-4 text-center bg-white rounded-2xl border border-slate-200/80 my-4">
        <PackageOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800 mb-1">
          No hay publicaciones todavía
        </h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
          Sé la primera familia en publicar un servicio o recomendación para esta comunidad escolar.
        </p>
        <a
          href="/publicar"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
        >
          <Sparkles className="w-4 h-4" />
          <span>Publicar un aviso</span>
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Mostrando {displayListings.length} servicio{displayListings.length === 1 ? '' : 's'}
          {selectedCategoryName ? ` en ${selectedCategoryName}` : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayListings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
}
