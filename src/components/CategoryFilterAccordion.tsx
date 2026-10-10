'use client';

import React, { useState, useMemo } from 'react';
import {
  Baby,
  GraduationCap,
  Bus,
  PartyPopper,
  Shirt,
  HeartPulse,
  Trophy,
  Home,
  LayoutGrid,
  Layers,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
} from 'lucide-react';

export interface Subcategory {
  id: string;
  name: string;
  slug: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  subcategories: Subcategory[];
}

export interface CategoryFilterAccordionProps {
  categories: Category[];
  selectedCategoryId: string;
  selectedSubcategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  onSelectSubcategory: (subcategoryId: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  isOpen?: boolean;
  onToggle?: () => void;
}

// Category Icon helper with Criana branding
export const renderCategoryIcon = (slug: string, className = 'w-4 h-4 text-mostaza') => {
  switch (slug) {
    case 'cuidado-infantil':
      return <Baby className={className} />;
    case 'apoyo-escolar':
      return <GraduationCap className={className} />;
    case 'transporte-escolar':
      return <Bus className={className} />;
    case 'cumpleanos-eventos':
      return <PartyPopper className={className} />;
    case 'uniformes-libros':
      return <Shirt className={className} />;
    case 'salud-psicopedagogia':
      return <HeartPulse className={className} />;
    case 'actividades-deportes':
      return <Trophy className={className} />;
    case 'servicios-hogar':
      return <Home className={className} />;
    default:
      return <LayoutGrid className={className} />;
  }
};

export default function CategoryFilterAccordion({
  categories,
  selectedCategoryId,
  selectedSubcategoryId,
  onSelectCategory,
  onSelectSubcategory,
  searchQuery,
  onSearchQueryChange,
  isOpen: controlledIsOpen,
  onToggle: controlledOnToggle,
}: CategoryFilterAccordionProps) {
  // Support both controlled and uncontrolled open state
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const toggleOpen = () => {
    if (controlledOnToggle) {
      controlledOnToggle();
    } else {
      setInternalIsOpen((prev) => !prev);
    }
  };

  const [showAllCategories, setShowAllCategories] = useState(false);

  // Selected Category & Subcategory objects
  const selectedCategoryObj = categories.find((c) => c.id === selectedCategoryId);
  const selectedSubcategoryObj = selectedCategoryObj?.subcategories?.find(
    (s) => s.id === selectedSubcategoryId
  );

  // Pick sample of 6 categories to show by default if not expanded
  const defaultCategorySample = useMemo(() => {
    return categories.slice(0, 6);
  }, [categories]);

  // Filter categories according to search query or expansion
  const visibleCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      return categories.filter((cat) => {
        const matchName = cat.name.toLowerCase().includes(q);
        const matchSlug = cat.slug.toLowerCase().includes(q);
        const matchSub = cat.subcategories?.some((sub) =>
          sub.name.toLowerCase().includes(q)
        );
        return matchName || matchSlug || matchSub;
      });
    }

    if (showAllCategories) {
      return categories;
    }

    // Default sample (include selected category if outside the first 6)
    const base = [...defaultCategorySample];
    if (selectedCategoryId && !base.some((c) => c.id === selectedCategoryId)) {
      const selected = categories.find((c) => c.id === selectedCategoryId);
      if (selected) base.push(selected);
    }
    return base;
  }, [categories, defaultCategorySample, showAllCategories, searchQuery, selectedCategoryId]);

  const hasActiveFilter = Boolean(selectedCategoryId || searchQuery.trim());

  return (
    <div className="bg-white rounded-[24px] shadow-criana hover:shadow-criana-hover border border-petroleo/10 transition-all duration-300 overflow-hidden">
      {/* Accordion Trigger Header */}
      <div
        role="button"
        tabIndex={0}
        onClick={toggleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleOpen();
          }
        }}
        className="w-full flex items-center justify-between p-4 sm:p-5 cursor-pointer select-none group transition-colors hover:bg-arena/20"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
          {/* Cool Icon Badge */}
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-200 shadow-2xs ${
              hasActiveFilter
                ? 'bg-mostaza/15 text-mostaza-dark border border-mostaza/30 scale-105'
                : 'bg-arena/70 text-petroleo border border-petroleo/10 group-hover:bg-petroleo group-hover:text-white'
            }`}
          >
            <Layers className="w-5 h-5" />
          </div>

          {/* Title & Active Filter Preview */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-serif font-bold text-base sm:text-lg text-petroleo leading-tight">
                Rubros y Servicios
              </h2>
              {hasActiveFilter && (
                <span className="inline-block w-2 h-2 rounded-full bg-mostaza animate-pulse" />
              )}
            </div>

            {/* Subtitle / Status Summary */}
            {selectedCategoryObj ? (
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-mostaza/15 text-petroleo border border-mostaza/30 text-xs font-semibold font-sans">
                  {renderCategoryIcon(selectedCategoryObj.slug, 'w-3.5 h-3.5 text-mostaza-dark')}
                  <span>
                    {selectedCategoryObj.name}
                    {selectedSubcategoryObj ? ` • ${selectedSubcategoryObj.name}` : ''}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCategory('');
                    onSelectSubcategory('');
                  }}
                  className="p-1 rounded-full text-secondary hover:text-coral hover:bg-coral/10 transition"
                  title="Quitar rubro"
                  aria-label="Quitar rubro"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : searchQuery.trim() ? (
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-arena text-petroleo border border-petroleo/20 text-xs font-semibold font-sans">
                  <Search className="w-3.5 h-3.5 text-secondary" />
                  <span>&ldquo;{searchQuery.trim()}&rdquo;</span>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSearchQueryChange('');
                  }}
                  className="p-1 rounded-full text-secondary hover:text-coral hover:bg-coral/10 transition"
                  title="Borrar búsqueda"
                  aria-label="Borrar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-xs text-secondary font-sans mt-0.5 truncate">
                Todos los rubros • Hacé clic para elegir categoría o buscar servicio
              </p>
            )}
          </div>
        </div>

        {/* Right side: Badge and Chevron */}
        <div className="flex items-center gap-2.5 shrink-0">
          {hasActiveFilter ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-display font-bold uppercase tracking-wider bg-mostaza/15 text-mostaza-dark border border-mostaza/30">
              <Check className="w-3 h-3" />
              <span>Filtrado</span>
            </span>
          ) : (
            <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-[11px] font-display font-semibold uppercase tracking-wider bg-arena/60 text-secondary border border-petroleo/10">
              Opcional
            </span>
          )}

          <div
            className={`w-9 h-9 rounded-full border border-petroleo/10 flex items-center justify-center transition-all duration-300 ${
              isOpen
                ? 'bg-petroleo text-white rotate-180 shadow-xs'
                : 'bg-arena/60 text-petroleo group-hover:bg-petroleo group-hover:text-white'
            }`}
          >
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Accordion Body */}
      {isOpen && (
        <div className="border-t border-petroleo/10 p-5 sm:p-7 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Integrated Search Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-display font-bold text-secondary uppercase tracking-[0.14em]">
              Buscar por palabra clave o especialidad
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-secondary absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Buscar servicio (ej: niñera, apoyo escolar, traslados, fletes...)"
                className="w-full pl-11 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm border border-petroleo/15 rounded-2xl bg-ivory focus:bg-white text-petroleo placeholder:text-petroleo/40 focus:outline-none focus:ring-2 focus:ring-petroleo/20 focus:border-petroleo transition font-sans shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchQueryChange('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-secondary hover:text-coral hover:bg-coral/10 transition"
                  title="Borrar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Categories Grid / Chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-display font-bold text-secondary uppercase tracking-[0.14em]">
                Seleccionar Rubro
              </span>
              {categories.length > 0 && !searchQuery && (
                <button
                  type="button"
                  onClick={() => setShowAllCategories((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-[11px] font-display font-bold uppercase tracking-wider text-coral hover:text-coral-dark transition"
                >
                  {showAllCategories ? (
                    <>
                      <ChevronUp className="w-3 h-3" />
                      <span>Ver menos</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3" />
                      <span>Ver todos ({categories.length})</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* All / Reset Pill */}
              <button
                type="button"
                onClick={() => {
                  onSelectCategory('');
                  onSelectSubcategory('');
                }}
                className={`flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs font-display font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                  !selectedCategoryId
                    ? 'bg-petroleo text-white shadow-xs ring-2 ring-petroleo/20'
                    : 'bg-white border border-petroleo/15 text-petroleo hover:bg-arena/50'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Todos los rubros</span>
              </button>

              {/* Individual Category Pills */}
              {visibleCategories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        onSelectCategory('');
                        onSelectSubcategory('');
                      } else {
                        onSelectCategory(cat.id);
                        onSelectSubcategory('');
                      }
                    }}
                    className={`flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs font-display font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                      isSelected
                        ? 'bg-petroleo text-white shadow-xs ring-2 ring-petroleo/20'
                        : 'bg-white border border-petroleo/15 text-petroleo hover:bg-arena/50'
                    }`}
                  >
                    {renderCategoryIcon(
                      cat.slug,
                      isSelected ? 'w-3.5 h-3.5 text-mostaza-light' : 'w-3.5 h-3.5 text-mostaza'
                    )}
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>

            {searchQuery && visibleCategories.length === 0 && (
              <p className="text-xs text-secondary italic font-sans py-2">
                No hay rubros con el nombre &ldquo;{searchQuery}&rdquo;, pero los resultados del catálogo abajo buscarán en títulos y descripciones.
              </p>
            )}
          </div>

          {/* Subcategories Panel */}
          {selectedCategoryObj && selectedCategoryObj.subcategories.length > 0 && (
            <div className="p-4 bg-arena/30 rounded-2xl border border-petroleo/10 shadow-2xs space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-coral" />
                <span className="text-xs font-display font-bold text-petroleo uppercase tracking-wider">
                  Especialidades en {selectedCategoryObj.name}:
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelectSubcategory('')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-display font-semibold uppercase tracking-wider transition ${
                    !selectedSubcategoryId
                      ? 'bg-petroleo text-white shadow-2xs'
                      : 'bg-white text-petroleo border border-petroleo/15 hover:bg-arena/70'
                  }`}
                >
                  Todas
                </button>
                {selectedCategoryObj.subcategories.map((sub) => {
                  const isSubSelected = selectedSubcategoryId === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() =>
                        onSelectSubcategory(isSubSelected ? '' : sub.id)
                      }
                      className={`px-3.5 py-1.5 rounded-full text-xs font-display font-semibold uppercase tracking-wider transition ${
                        isSubSelected
                          ? 'bg-coral text-white font-bold shadow-xs'
                          : 'bg-white text-petroleo border border-petroleo/15 hover:bg-arena/70'
                      }`}
                    >
                      {sub.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Bar: Action to close / collapse */}
          <div className="pt-2 flex items-center justify-between border-t border-petroleo/10">
            <span className="text-[11px] text-secondary font-sans">
              {hasActiveFilter ? 'Filtro aplicado al catálogo.' : 'Explorando todos los servicios.'}
            </span>
            <button
              type="button"
              onClick={toggleOpen}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-display font-semibold uppercase tracking-wider bg-petroleo text-white hover:bg-petroleo-light transition shadow-2xs"
            >
              <span>Cerrar filtro</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
