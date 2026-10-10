'use client';

import React, { useState, useMemo } from 'react';
import {
  Tag as TagIcon,
  MapPin,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
  Globe,
  Compass,
  Building,
} from 'lucide-react';
import {
  WORK_ZONE_OPTIONS,
  CABA_BARRIOS,
  GBA_PARTIDOS_NORTE,
  GBA_PARTIDOS_OESTE,
  GBA_PARTIDOS_SUR,
  GBA_LOCALIDADES_DESTACADAS,
  formatWorkZoneDisplay,
} from '@/lib/tags';

export interface TagItem {
  id: string;
  name: string;
  slug: string;
  group?: string | null;
  orderIndex?: number;
  _count?: {
    listings: number;
  };
}

export interface TagFilterAccordionProps {
  tags: TagItem[];
  selectedTag: TagItem | null;
  onSelectTag: (tag: TagItem | null) => void;
  selectedWorkZone: string;
  onSelectWorkZone: (zone: string) => void;
  selectedNeighborhood: string;
  onSelectNeighborhood: (neighborhood: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function TagFilterAccordion({
  tags,
  selectedTag,
  onSelectTag,
  selectedWorkZone,
  onSelectWorkZone,
  selectedNeighborhood,
  onSelectNeighborhood,
  searchQuery,
  onSearchQueryChange,
  isOpen: controlledIsOpen,
  onToggle: controlledOnToggle,
}: TagFilterAccordionProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const toggleOpen = () => {
    if (controlledOnToggle) {
      controlledOnToggle();
    } else {
      setInternalIsOpen((prev) => !prev);
    }
  };

  const [activeGroup, setActiveGroup] = useState<string>('TODOS');
  const [tagSearchText, setTagSearchText] = useState<string>('');
  const [showAllTags, setShowAllTags] = useState(false);

  // Extract distinct tag groups
  const groups = useMemo(() => {
    const set = new Set<string>();
    tags.forEach((t) => {
      if (t.group) set.add(t.group);
    });
    return Array.from(set).sort();
  }, [tags]);

  // Filter tags based on group and local tag search
  const visibleTags = useMemo(() => {
    let result = tags;

    if (activeGroup !== 'TODOS') {
      result = result.filter((t) => t.group === activeGroup);
    }

    if (tagSearchText.trim()) {
      const q = tagSearchText.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.slug.toLowerCase().includes(q) ||
          (t.group && t.group.toLowerCase().includes(q))
      );
    }

    if (!showAllTags && !tagSearchText.trim() && activeGroup === 'TODOS') {
      // Show first 16 most relevant tags when collapsed in "TODOS"
      return result.slice(0, 16);
    }

    return result;
  }, [tags, activeGroup, tagSearchText, showAllTags]);

  const hasActiveFilter = Boolean(
    selectedTag || selectedWorkZone || selectedNeighborhood || searchQuery.trim()
  );

  const activeZoneDisplay = formatWorkZoneDisplay(selectedWorkZone, selectedNeighborhood);

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
            <TagIcon className="w-5 h-5" />
          </div>

          {/* Title & Active Filter Preview */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-serif font-bold text-base sm:text-lg text-petroleo leading-tight">
                Rubros y Zonas de Trabajo
              </h2>
              {hasActiveFilter && (
                <span className="inline-block w-2 h-2 rounded-full bg-mostaza animate-pulse" />
              )}
            </div>

            {/* Subtitle / Status Summary */}
            <div className="flex items-center gap-2 flex-wrap mt-1">
              {selectedTag && (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-mostaza/15 text-petroleo border border-mostaza/30 text-xs font-semibold font-sans">
                  <span>#{selectedTag.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTag(null);
                    }}
                    className="p-0.5 rounded-full text-secondary hover:text-coral transition"
                    title="Quitar tag"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {activeZoneDisplay && (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-petroleo/10 text-petroleo border border-petroleo/20 text-xs font-semibold font-sans">
                  <MapPin className="w-3 h-3 text-coral" />
                  <span>{activeZoneDisplay}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectWorkZone('');
                      onSelectNeighborhood('');
                    }}
                    className="p-0.5 rounded-full text-secondary hover:text-coral transition"
                    title="Quitar zona"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {searchQuery.trim() && (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-arena text-petroleo border border-petroleo/20 text-xs font-semibold font-sans">
                  <Search className="w-3 h-3 text-secondary" />
                  <span>&ldquo;{searchQuery.trim()}&rdquo;</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSearchQueryChange('');
                    }}
                    className="p-0.5 rounded-full text-secondary hover:text-coral transition"
                    title="Borrar búsqueda"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {!hasActiveFilter && (
                <p className="text-xs text-secondary font-sans truncate">
                  Todos los servicios y zonas • Hacé clic para filtrar por especialidad o zona
                </p>
              )}
            </div>
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
        <div className="border-t border-petroleo/10 p-5 sm:p-7 space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* 1. SECCIÓN: ZONA DE TRABAJO */}
          <div className="space-y-3 p-4 sm:p-5 rounded-2xl bg-arena/30 border border-petroleo/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-coral" />
                <span className="text-xs font-display font-bold text-petroleo uppercase tracking-[0.14em]">
                  ¿En qué zona buscás el servicio?
                </span>
              </div>
              {selectedWorkZone && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectWorkZone('');
                    onSelectNeighborhood('');
                  }}
                  className="text-[11px] font-display font-bold uppercase tracking-wider text-coral hover:text-coral-dark transition"
                >
                  Limpiar zona
                </button>
              )}
            </div>

            {/* Zone Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onSelectWorkZone('');
                  onSelectNeighborhood('');
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-display font-bold uppercase tracking-wider transition ${
                  !selectedWorkZone
                    ? 'bg-petroleo text-white shadow-2xs'
                    : 'bg-white text-petroleo border border-petroleo/15 hover:bg-arena/50'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Todas las zonas</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectWorkZone('TODO_EL_PAIS');
                  onSelectNeighborhood('');
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-display font-bold uppercase tracking-wider transition ${
                  selectedWorkZone === 'TODO_EL_PAIS'
                    ? 'bg-petroleo text-white shadow-2xs'
                    : 'bg-white text-petroleo border border-petroleo/15 hover:bg-arena/50'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-mostaza" />
                <span>En todo el país</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectWorkZone('TODO_AMBA');
                  onSelectNeighborhood('');
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-display font-bold uppercase tracking-wider transition ${
                  selectedWorkZone === 'TODO_AMBA'
                    ? 'bg-petroleo text-white shadow-2xs'
                    : 'bg-white text-petroleo border border-petroleo/15 hover:bg-arena/50'
                }`}
              >
                <span>🚗 En todo AMBA</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectWorkZone('TODO_CABA');
                  onSelectNeighborhood('');
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-display font-bold uppercase tracking-wider transition ${
                  selectedWorkZone === 'TODO_CABA'
                    ? 'bg-petroleo text-white shadow-2xs'
                    : 'bg-white text-petroleo border border-petroleo/15 hover:bg-arena/50'
                }`}
              >
                <Building className="w-3.5 h-3.5 text-sky-600" />
                <span>En todo CABA</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedWorkZone !== 'BARRIO') {
                    onSelectWorkZone('BARRIO');
                    onSelectNeighborhood('');
                  }
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-display font-bold uppercase tracking-wider transition ${
                  selectedWorkZone === 'BARRIO'
                    ? 'bg-petroleo text-white shadow-2xs'
                    : 'bg-white text-petroleo border border-petroleo/15 hover:bg-arena/50'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-coral" />
                <span>Barrio (CABA)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedWorkZone !== 'PARTIDO') {
                    onSelectWorkZone('PARTIDO');
                    onSelectNeighborhood('');
                  }
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-display font-bold uppercase tracking-wider transition ${
                  selectedWorkZone === 'PARTIDO'
                    ? 'bg-petroleo text-white shadow-2xs'
                    : 'bg-white text-petroleo border border-petroleo/15 hover:bg-arena/50'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-mostaza" />
                <span>Partido (GBA)</span>
              </button>
            </div>

            {/* CABA Neighborhood picker if BARRIO selected */}
            {selectedWorkZone === 'BARRIO' && (
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 animate-in fade-in duration-200">
                <div className="relative flex-1">
                  <select
                    value={selectedNeighborhood}
                    onChange={(e) => onSelectNeighborhood(e.target.value)}
                    className="w-full px-4 py-2 text-xs sm:text-sm border border-petroleo/20 rounded-xl bg-white text-petroleo focus:outline-none focus:ring-2 focus:ring-petroleo/20 font-sans"
                  >
                    <option value="">Seleccionar barrio de CABA o escribir abajo...</option>
                    {CABA_BARRIOS.map((barrio) => (
                      <option key={barrio} value={barrio}>
                        {barrio}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:w-64">
                  <input
                    type="text"
                    value={selectedNeighborhood}
                    onChange={(e) => onSelectNeighborhood(e.target.value)}
                    placeholder="O escribir barrio de CABA..."
                    className="w-full px-3.5 py-2 text-xs sm:text-sm border border-petroleo/20 rounded-xl bg-white text-petroleo focus:outline-none focus:ring-2 focus:ring-petroleo/20 font-sans"
                  />
                </div>
              </div>
            )}

            {/* GBA Partido picker if PARTIDO selected */}
            {selectedWorkZone === 'PARTIDO' && (
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 animate-in fade-in duration-200">
                <div className="relative flex-1">
                  <select
                    value={selectedNeighborhood}
                    onChange={(e) => onSelectNeighborhood(e.target.value)}
                    className="w-full px-4 py-2 text-xs sm:text-sm border border-petroleo/20 rounded-xl bg-white text-petroleo focus:outline-none focus:ring-2 focus:ring-petroleo/20 font-sans"
                  >
                    <option value="">Seleccionar partido de GBA o escribir abajo...</option>
                    <optgroup label="Zona Norte GBA">
                      {GBA_PARTIDOS_NORTE.map((partido) => (
                        <option key={partido} value={partido}>
                          {partido}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Zona Oeste GBA">
                      {GBA_PARTIDOS_OESTE.map((partido) => (
                        <option key={partido} value={partido}>
                          {partido}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Zona Sur GBA">
                      {GBA_PARTIDOS_SUR.map((partido) => (
                        <option key={partido} value={partido}>
                          {partido}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Localidades destacadas GBA">
                      {GBA_LOCALIDADES_DESTACADAS.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div className="sm:w-64">
                  <input
                    type="text"
                    value={selectedNeighborhood}
                    onChange={(e) => onSelectNeighborhood(e.target.value)}
                    placeholder="O escribir partido / localidad (ej: San Isidro, Olivos)..."
                    className="w-full px-3.5 py-2 text-xs sm:text-sm border border-petroleo/20 rounded-xl bg-white text-petroleo focus:outline-none focus:ring-2 focus:ring-petroleo/20 font-sans"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. SECCIÓN: TAGS DE SERVICIO */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-mostaza" />
                <span className="text-xs font-display font-bold text-secondary uppercase tracking-[0.14em]">
                  Especialidad / Servicio (Tags)
                </span>
              </div>

              {/* Tag Quick Search Filter */}
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={tagSearchText}
                  onChange={(e) => setTagSearchText(e.target.value)}
                  placeholder="Filtrar tags (ej: inglés, niñera, física)..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs border border-petroleo/15 rounded-xl bg-ivory focus:bg-white text-petroleo placeholder:text-petroleo/40 focus:outline-none focus:ring-2 focus:ring-petroleo/20 transition font-sans"
                />
                {tagSearchText && (
                  <button
                    type="button"
                    onClick={() => setTagSearchText('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-secondary hover:text-coral"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Group Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveGroup('TODOS')}
                className={`px-3 py-1 rounded-lg font-display font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap transition ${
                  activeGroup === 'TODOS'
                    ? 'bg-petroleo text-white shadow-2xs'
                    : 'bg-arena/50 text-secondary hover:text-petroleo hover:bg-arena'
                }`}
              >
                Todos
              </button>
              {groups.map((group) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => setActiveGroup(group)}
                  className={`px-3 py-1 rounded-lg font-display font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap transition ${
                    activeGroup === group
                      ? 'bg-petroleo text-white shadow-2xs'
                      : 'bg-arena/50 text-secondary hover:text-petroleo hover:bg-arena'
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>

            {/* Tag Cloud / Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1 max-h-72 overflow-y-auto pr-1">
              {/* All / Reset Pill */}
              <button
                type="button"
                onClick={() => onSelectTag(null)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-display font-bold uppercase tracking-wider transition ${
                  !selectedTag
                    ? 'bg-petroleo text-white shadow-xs ring-2 ring-petroleo/20'
                    : 'bg-white border border-petroleo/15 text-petroleo hover:bg-arena/50'
                }`}
              >
                <span>Todos los tags</span>
              </button>

              {visibleTags.map((t) => {
                const isSelected = selectedTag?.id === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSelectTag(isSelected ? null : t)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-petroleo text-white font-bold shadow-xs ring-2 ring-petroleo/20'
                        : 'bg-white border border-petroleo/15 text-petroleo hover:bg-arena/50 hover:border-petroleo/30'
                    }`}
                  >
                    <span className={isSelected ? 'text-mostaza' : 'text-mostaza-dark'}>#</span>
                    <span>{t.name}</span>
                    {t._count && t._count.listings > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-sans font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-petroleo/10 text-petroleo'
                        }`}
                      >
                        {t._count.listings}
                      </span>
                    )}
                  </button>
                );
              })}

              {visibleTags.length === 0 && (
                <p className="text-xs text-secondary italic font-sans py-2">
                  No se encontraron tags para &ldquo;{tagSearchText}&rdquo;.
                </p>
              )}
            </div>

            {/* Expand / Collapse Tag Cloud if in TODOS and more than 16 */}
            {!tagSearchText && activeGroup === 'TODOS' && tags.length > 16 && (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => setShowAllTags((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-[11px] font-display font-bold uppercase tracking-wider text-coral hover:text-coral-dark transition"
                >
                  {showAllTags ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Ver menos tags</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Ver los {tags.length} tags completos</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* 3. BÚSQUEDA GENERAL POR TEXTO EN PUBLICACIONES */}
          <div className="space-y-1.5 pt-2 border-t border-petroleo/10">
            <label className="block text-xs font-display font-bold text-secondary uppercase tracking-[0.14em]">
              Búsqueda en texto de publicaciones
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-secondary absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Buscar por palabras clave en títulos o descripciones de avisos..."
                className="w-full pl-11 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm border border-petroleo/15 rounded-2xl bg-ivory focus:bg-white text-petroleo placeholder:text-petroleo/40 focus:outline-none focus:ring-2 focus:ring-petroleo/20 focus:border-petroleo transition font-sans shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchQueryChange('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-secondary hover:text-coral hover:bg-coral/10 transition"
                  title="Borrar texto"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

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
