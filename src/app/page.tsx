'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import CascadingSelector, { SchoolOption } from '@/components/CascadingSelector';
import CatalogGrid from '@/components/CatalogGrid';
import AdminPendingSection from '@/components/AdminPendingSection';
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
  Sparkles,
  Users,
  Search,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Subcategory {
  id: string;
  name: string;
  slug: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  subcategories: Subcategory[];
}

export default function HomePage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const [selectedSchool, setSelectedSchool] = useState<SchoolOption | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [randomCategoryIds, setRandomCategoryIds] = useState<string[]>([]);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [searchServiceQuery, setSearchServiceQuery] = useState('');

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('');
  const [listings, setListings] = useState<any[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);

  // 1. Fetch Categories and pick random sample
  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data);
          // Seleccionar 4 rubros aleatorios para mostrar inicialmente
          const shuffled = [...data].sort(() => 0.5 - Math.random());
          setRandomCategoryIds(shuffled.slice(0, 4).map((c) => c.id));
        }
      })
      .catch((err) => console.error('Error fetching categories:', err));
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
      if (selectedCategoryId) {
        params.set('categoryId', selectedCategoryId);
      }
      if (selectedSubcategoryId) {
        params.set('subcategoryId', selectedSubcategoryId);
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
  }, [selectedSchool, selectedCategoryId, selectedSubcategoryId, searchServiceQuery]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchListings();
    }, 250);
    return () => clearTimeout(handler);
  }, [fetchListings]);

  // Handle category tab change
  const handleCategoryChange = (catId: string) => {
    if (selectedCategoryId === catId) {
      setSelectedCategoryId('');
      setSelectedSubcategoryId('');
    } else {
      setSelectedCategoryId(catId);
      setSelectedSubcategoryId('');
    }
  };

  const selectedCategoryObj = categories.find((c) => c.id === selectedCategoryId);

  // Category Icon helper with Criana theme
  const renderCategoryIcon = (slug: string) => {
    const iconClass = 'w-4 h-4 text-mostaza';
    switch (slug) {
      case 'cuidado-infantil':
        return <Baby className={iconClass} />;
      case 'apoyo-escolar':
        return <GraduationCap className={iconClass} />;
      case 'transporte-escolar':
        return <Bus className={iconClass} />;
      case 'cumpleanos-eventos':
        return <PartyPopper className={iconClass} />;
      case 'uniformes-libros':
        return <Shirt className={iconClass} />;
      case 'salud-psicopedagogia':
        return <HeartPulse className={iconClass} />;
      case 'actividades-deportes':
        return <Trophy className={iconClass} />;
      case 'servicios-hogar':
        return <Home className={iconClass} />;
      default:
        return <LayoutGrid className={iconClass} />;
    }
  };

  // 3. Determine visible categories:
  // - If user typed a search query: filter categories matching query by name or subcategory
  // - If no query: show only random subset (unless user expanded with showAllCategories)
  const visibleCategories = useMemo(() => {
    const query = searchServiceQuery.trim().toLowerCase();
    if (query) {
      return categories.filter((cat) => {
        const matchName = cat.name.toLowerCase().includes(query);
        const matchSlug = cat.slug.toLowerCase().includes(query);
        const matchSub = cat.subcategories?.some((sub) =>
          sub.name.toLowerCase().includes(query)
        );
        return matchName || matchSlug || matchSub;
      });
    }

    if (showAllCategories) {
      return categories;
    }

    // Mostrar solo algunos random (4)
    const randomSet = categories.filter((c) => randomCategoryIds.includes(c.id));
    // Si hay una categoría seleccionada por el usuario que no está en el random, agregarla para que no desaparezca
    if (selectedCategoryId && !randomSet.some((c) => c.id === selectedCategoryId)) {
      const selectedCat = categories.find((c) => c.id === selectedCategoryId);
      if (selectedCat) randomSet.push(selectedCat);
    }

    return randomSet.length > 0 ? randomSet : categories.slice(0, 4);
  }, [categories, randomCategoryIds, showAllCategories, searchServiceQuery, selectedCategoryId]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-10">
      {/* Hero Section Boutique & Editorial */}
      <section className="text-center py-6 sm:py-10 max-w-3xl mx-auto space-y-4">
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

      {/* 3-Tier Cascading Filter */}
      <section aria-label="Filtro de colegios">
        <CascadingSelector
          onSchoolChange={(school) => setSelectedSchool(school)}
          selectedSchoolId={selectedSchool?.id}
        />
      </section>

      {/* Category Filter Tabs con buscador y visualización aleatoria reducida */}
      <section className="space-y-4" aria-label="Filtro de categorías y servicios">
        {/* Cabecera de la sección con buscador de texto integrado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xs font-bold text-secondary uppercase tracking-[0.14em] flex items-center gap-2">
              <Users className="w-4 h-4 text-mostaza" />
              <span>Rubros</span>
            </h2>
          </div>

          {/* Buscador de texto para filtrar rubros y servicios automáticamente */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchServiceQuery}
              onChange={(e) => setSearchServiceQuery(e.target.value)}
              placeholder="Buscar servicio o rubro (ej: niñera, inglés...)"
              className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm border border-petroleo/15 rounded-full bg-ivory focus:bg-white text-petroleo placeholder:text-petroleo/40 focus:outline-none focus:ring-2 focus:ring-petroleo/20 focus:border-petroleo transition font-sans shadow-2xs"
            />
            {searchServiceQuery && (
              <button
                type="button"
                onClick={() => setSearchServiceQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-secondary hover:text-coral transition"
                title="Borrar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Categories Bar Pills: muestra solo algunos random o los filtrados por texto */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setSelectedCategoryId('');
              setSelectedSubcategoryId('');
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-display font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
              !selectedCategoryId
                ? 'bg-petroleo text-white shadow-xs'
                : 'bg-white border border-petroleo/15 text-petroleo hover:bg-arena/50'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Todos</span>
          </button>

          {visibleCategories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryChange(cat.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-display font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-petroleo text-white shadow-xs ring-2 ring-petroleo/20'
                    : 'bg-white border border-petroleo/15 text-petroleo hover:bg-arena/50'
                }`}
              >
                {renderCategoryIcon(cat.slug)}
                <span>{cat.name}</span>
              </button>
            );
          })}

          {/* Botón para expandir o colapsar todos los rubros si no hay búsqueda activa */}
          {!searchServiceQuery && (
            <button
              type="button"
              onClick={() => setShowAllCategories((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-display font-semibold uppercase tracking-wider text-secondary hover:text-petroleo border border-dashed border-petroleo/25 hover:border-petroleo/50 hover:bg-arena/30 transition"
            >
              {showAllCategories ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-coral" />
                  <span>Mostrar menos</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-coral" />
                  <span>Ver todos ({categories.length})</span>
                </>
              )}
            </button>
          )}

          {/* Si hay búsqueda activa pero no hubo rubros exactos que coincidan */}
          {searchServiceQuery && visibleCategories.length === 0 && (
            <span className="text-xs text-secondary italic font-sans py-2">
              Buscando avisos que coincidan con &ldquo;{searchServiceQuery}&rdquo;...
            </span>
          )}
        </div>

        {/* Subcategories Pills if a category is selected */}
        {selectedCategoryObj && selectedCategoryObj.subcategories.length > 0 && (
          <div className="p-3.5 bg-white rounded-2xl border border-petroleo/10 shadow-xs flex flex-wrap items-center gap-2 animate-in fade-in duration-200">
            <span className="text-xs font-display font-bold text-secondary uppercase tracking-wider mr-1">
              Especialidad:
            </span>
            <button
              type="button"
              onClick={() => setSelectedSubcategoryId('')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-display font-semibold uppercase tracking-wider transition ${
                !selectedSubcategoryId
                  ? 'bg-petroleo text-white'
                  : 'bg-arena text-petroleo hover:bg-arena/70'
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
                    setSelectedSubcategoryId(isSubSelected ? '' : sub.id)
                  }
                  className={`px-3.5 py-1.5 rounded-full text-xs font-display font-semibold uppercase tracking-wider transition ${
                    isSubSelected
                      ? 'bg-coral text-white font-bold'
                      : 'bg-arena text-petroleo hover:bg-arena/70'
                  }`}
                >
                  {sub.name}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Public Catalog Feed */}
      <section aria-label="Catálogo de servicios">
        <CatalogGrid
          listings={listings}
          isLoading={loadingListings}
          selectedCategorySlug={selectedCategoryObj?.slug}
          selectedCategoryName={selectedCategoryObj?.name}
        />
      </section>
    </div>
  );
}
