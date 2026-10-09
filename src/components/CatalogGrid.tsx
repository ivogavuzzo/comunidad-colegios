'use client';

import React, { useState, useEffect, useRef } from 'react';
import ListingCard, { ListingCardProps } from './ListingCard';
import { PackageOpen, Sparkles, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

export interface CatalogGridProps {
  listings: ListingCardProps['listing'][];
  isLoading?: boolean;
  selectedCategorySlug?: string;
  selectedCategoryName?: string;
}

const ITEMS_PER_PAGE = 12;

export default function CatalogGrid({
  listings,
  isLoading = false,
  selectedCategorySlug,
  selectedCategoryName,
}: CatalogGridProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const gridTopRef = useRef<HTMLDivElement>(null);

  // Reset to page 1 whenever listings or category change
  useEffect(() => {
    setCurrentPage(1);
  }, [listings, selectedCategorySlug]);

  if (isLoading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-secondary">
        <Loader2 className="w-8 h-8 text-coral animate-spin mb-3" />
        <p className="text-sm font-medium font-sans">Buscando publicaciones de la comunidad...</p>
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
      <div className="py-16 px-4 text-center bg-white rounded-[24px] border border-petroleo/10 shadow-criana my-4">
        <div className="w-14 h-14 rounded-full bg-arena flex items-center justify-center text-secondary mx-auto mb-4">
          <PackageOpen className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-serif font-bold text-petroleo mb-1">
          No hay publicaciones todavía
        </h3>
        <p className="text-sm text-secondary font-sans max-w-md mx-auto mb-6">
          Sé la primera familia en publicar un servicio o recomendación para esta comunidad escolar.
        </p>
        <a
          href="/publicar"
          className="inline-flex items-center gap-2 px-6 py-3 bg-coral hover:bg-coral-dark text-white rounded-full text-xs font-display font-bold uppercase tracking-wider shadow-sm transition"
        >
          <Sparkles className="w-4 h-4" />
          <span>Publicar un aviso</span>
        </a>
      </div>
    );
  }

  const totalPages = Math.ceil(displayListings.length / ITEMS_PER_PAGE);
  const activePage = Math.min(Math.max(currentPage, 1), totalPages || 1);

  const startIndex = (activePage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedListings = displayListings.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (gridTopRef.current) {
      gridTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Helper for generating page numbers with ellipsis if needed
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (activePage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }

    if (activePage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, '...', activePage - 1, activePage, activePage + 1, '...', totalPages];
  };

  return (
    <div ref={gridTopRef} className="space-y-6 scroll-mt-24">
      {/* Feed Counter Header */}
      <div className="flex items-center justify-between text-xs sm:text-sm text-secondary px-1">
        <span>
          Mostrando{' '}
          <strong className="text-petroleo font-semibold">
            {startIndex + 1}–{Math.min(endIndex, displayListings.length)}
          </strong>{' '}
          de <strong className="text-petroleo font-semibold">{displayListings.length}</strong>{' '}
          servicio{displayListings.length === 1 ? '' : 's'}
          {selectedCategoryName ? ` en ${selectedCategoryName}` : ''}
        </span>
        {totalPages > 1 && (
          <span className="text-xs font-display uppercase tracking-wider text-secondary">
            Página {activePage} de {totalPages}
          </span>
        )}
      </div>

      {/* Grid of Listings (Up to 12 tiles) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedListings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pt-6 pb-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-petroleo/10">
          <div className="text-xs text-secondary font-sans order-2 sm:order-1">
            Página <span className="font-semibold text-petroleo">{activePage}</span> de{' '}
            <span className="font-semibold text-petroleo">{totalPages}</span> (12 por página)
          </div>

          <div className="flex items-center gap-1.5 order-1 sm:order-2">
            {/* Previous Button */}
            <button
              type="button"
              onClick={() => handlePageChange(activePage - 1)}
              disabled={activePage === 1}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-display font-semibold uppercase tracking-wider border border-petroleo/15 text-petroleo bg-white hover:bg-arena/50 disabled:opacity-40 disabled:pointer-events-none transition"
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Anterior</span>
            </button>

            {/* Page Number Buttons */}
            <div className="flex items-center gap-1">
              {getPageNumbers().map((item, index) => {
                if (item === '...') {
                  return (
                    <span
                      key={`ellipsis-${index}`}
                      className="px-2 py-1 text-xs text-secondary select-none font-sans"
                    >
                      ...
                    </span>
                  );
                }

                const pageNum = item as number;
                const isActive = pageNum === activePage;

                return (
                  <button
                    key={`page-${pageNum}`}
                    type="button"
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-9 h-9 rounded-xl text-xs font-display font-bold transition flex items-center justify-center ${
                      isActive
                        ? 'bg-petroleo text-white shadow-xs'
                        : 'border border-petroleo/15 text-petroleo bg-white hover:bg-arena/50'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={`Ir a la página ${pageNum}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Next Button */}
            <button
              type="button"
              onClick={() => handlePageChange(activePage + 1)}
              disabled={activePage === totalPages}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-display font-semibold uppercase tracking-wider border border-petroleo/15 text-petroleo bg-white hover:bg-arena/50 disabled:opacity-40 disabled:pointer-events-none transition"
              aria-label="Página siguiente"
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
