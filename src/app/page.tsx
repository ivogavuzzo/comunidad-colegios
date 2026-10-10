'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import CascadingSelector, { SchoolOption } from '@/components/CascadingSelector';
import TagFilterAccordion, { TagItem } from '@/components/TagFilterAccordion';
import CatalogGrid from '@/components/CatalogGrid';
import AdminPendingSection from '@/components/AdminPendingSection';
import { formatWorkZoneDisplay } from '@/lib/tags';
import {
  Sparkles,
  X,
  RotateCcw,
  SlidersHorizontal,
  MapPin,
  Tag as TagIcon,
} from 'lucide-react';

export default function HomePage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const [selectedSchool, setSelectedSchool] = useState<SchoolOption | null>(null);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [selectedTag, setSelectedTag] = useState<TagItem | null>(null);
  const [selectedWorkZone, setSelectedWorkZone] = useState<string>('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('');
  const [searchServiceQuery, setSearchServiceQuery] = useState('');

  const [listings, setListings] = useState<any[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);

  // Accordion states: both collapsed by default
  const [isSchoolAccordionOpen, setIsSchoolAccordionOpen] = useState(false);
  const [isTagAccordionOpen, setIsTagAccordionOpen] = useState(false);

  // 1. Fetch Tags
  useEffect(() => {
    fetch('/api/tags')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTags(data);
        }
      })
      .catch((err) => console.error('Error fetching tags:', err));
  }, []);

  // 2. Fetch Listings when filters or text search query change
  const fetchListings = useCallback(async () => {
    setLoadingListings(true);
    try {
      const params = new URLSearchParams();
      if (selectedSchool) {
        const idParam =
          selectedSchool.ids && selectedSchool.ids.length > 0
            ? selectedSchool.ids.join(',')
            : selectedSchool.id;
        params.set('schoolId', idParam);
      }
      if (selectedTag) {
        params.set('tag', selectedTag.slug);
      }
      if (selectedWorkZone) {
        if (selectedWorkZone === 'BARRIO' && selectedNeighborhood.trim()) {
          params.set('workZone', selectedNeighborhood.trim());
        } else {
          params.set('workZone', selectedWorkZone);
        }
      }
      if (searchServiceQuery.trim()) {
        params.set('q', searchServiceQuery.trim());
      }

      const res = await fetch(`/api/listings?${params.toString()}`);
      const data = await res.json();
      setListings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setListings([]);
    } finally {
      setLoadingListings(false);
    }
  }, [selectedSchool, selectedTag, selectedWorkZone, selectedNeighborhood, searchServiceQuery]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchListings();
    }, 250);
    return () => clearTimeout(handler);
  }, [fetchListings]);

  const activeZoneDisplay = formatWorkZoneDisplay(selectedWorkZone, selectedNeighborhood);

  const hasAnyFilter = Boolean(
    selectedSchool || selectedTag || selectedWorkZone || selectedNeighborhood || searchServiceQuery.trim()
  );

  const handleClearAllFilters = () => {
    setSelectedSchool(null);
    setSelectedTag(null);
    setSelectedWorkZone('');
    setSelectedNeighborhood('');
    setSearchServiceQuery('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 w-full space-y-8 sm:space-y-10">
      {/* Hero Section Boutique & Editorial */}
      <section className="text-center py-4 sm:py-8 max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-arena border border-petroleo/10 text-coral text-xs font-display font-bold uppercase tracking-[0.16em] shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-mostaza" />
          <span>Comunidad Escolar AMBA</span>
        </div>

        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-petroleo tracking-tight leading-[1.15]">
          Servicios y recomendaciones{' '}
          <span className="italic font-normal text-coral">entre familias de colegios</span>
        </h1>

        <p className="font-sans text-base sm:text-lg text-secondary leading-relaxed max-w-2xl mx-auto">
          Encontrá niñeras pedagógicas, apoyo escolar, traslados, viandas y más, compartidos
          directamente por familias de tu comunidad escolar.
        </p>
      </section>

      {/* Sección exclusiva para Administrador: Avisos pendientes de aprobación */}
      {isAdmin && (
        <AdminPendingSection
          onApproved={() => {
            fetchListings();
          }}
        />
      )}

      {/* Deck de Filtros Desplegables Modernos (Colegio y Rubros/Zonas) */}
      <section className="space-y-3.5" aria-label="Filtros de búsqueda desplegables">
        {/* Barra resumen de filtros activos (aparece cuando hay filtros aplicados) */}
        {hasAnyFilter && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:px-5 sm:py-3 rounded-2xl bg-petroleo/5 border border-petroleo/10 text-xs font-sans animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-mostaza" />
                <span>Filtros activos:</span>
              </span>

              {/* Tag Colegio */}
              {selectedSchool && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-emerald-300 text-petroleo font-medium shadow-2xs">
                  <span>🏫 {selectedSchool.nombre}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedSchool(null)}
                    className="p-0.5 rounded-full text-secondary hover:text-coral transition"
                    title="Quitar filtro de colegio"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Tag Servicio */}
              {selectedTag && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-mostaza/30 text-petroleo font-medium shadow-2xs">
                  <TagIcon className="w-3 h-3 text-mostaza-dark" />
                  <span>#{selectedTag.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedTag(null)}
                    className="p-0.5 rounded-full text-secondary hover:text-coral transition"
                    title="Quitar filtro de tag"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Tag Zona de Trabajo */}
              {activeZoneDisplay && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-petroleo/20 text-petroleo font-medium shadow-2xs">
                  <MapPin className="w-3 h-3 text-coral" />
                  <span>{activeZoneDisplay}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedWorkZone('');
                      setSelectedNeighborhood('');
                    }}
                    className="p-0.5 rounded-full text-secondary hover:text-coral transition"
                    title="Quitar filtro de zona"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Tag Búsqueda por texto */}
              {searchServiceQuery.trim() && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-petroleo/20 text-petroleo font-medium shadow-2xs">
                  <span>🔍 &ldquo;{searchServiceQuery.trim()}&rdquo;</span>
                  <button
                    type="button"
                    onClick={() => setSearchServiceQuery('')}
                    className="p-0.5 rounded-full text-secondary hover:text-coral transition"
                    title="Borrar texto"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleClearAllFilters}
              className="inline-flex items-center gap-1 font-display font-bold uppercase tracking-wider text-coral hover:text-coral-dark text-[11px] hover:underline underline-offset-2 transition ml-auto"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpiar todo</span>
            </button>
          </div>
        )}

        {/* 1. Acordeón Filtro por Colegio */}
        <CascadingSelector
          onSchoolChange={(school) => setSelectedSchool(school)}
          selectedSchoolId={selectedSchool?.id}
          isOpen={isSchoolAccordionOpen}
          onToggle={() => setIsSchoolAccordionOpen((prev) => !prev)}
        />

        {/* 2. Acordeón Filtro por Rubros y Zona de Trabajo */}
        <TagFilterAccordion
          tags={tags}
          selectedTag={selectedTag}
          onSelectTag={(tag) => setSelectedTag(tag)}
          selectedWorkZone={selectedWorkZone}
          onSelectWorkZone={(zone) => setSelectedWorkZone(zone)}
          selectedNeighborhood={selectedNeighborhood}
          onSelectNeighborhood={(neighborhood) => setSelectedNeighborhood(neighborhood)}
          searchQuery={searchServiceQuery}
          onSearchQueryChange={(q) => setSearchServiceQuery(q)}
          isOpen={isTagAccordionOpen}
          onToggle={() => setIsTagAccordionOpen((prev) => !prev)}
        />
      </section>

      {/* Public Catalog Feed */}
      <section aria-label="Catálogo de servicios">
        <CatalogGrid
          listings={listings}
          isLoading={loadingListings}
          selectedTagSlug={selectedTag?.slug}
          selectedTagName={selectedTag?.name}
          selectedWorkZoneLabel={activeZoneDisplay || undefined}
        />
      </section>
    </div>
  );
}
