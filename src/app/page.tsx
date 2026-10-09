'use client';

import React, { useState, useEffect, useCallback } from 'react';
import CascadingSelector, { SchoolOption } from '@/components/CascadingSelector';
import CatalogGrid from '@/components/CatalogGrid';
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
  const [selectedSchool, setSelectedSchool] = useState<SchoolOption | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('');
  const [listings, setListings] = useState<any[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);

  // 1. Fetch Categories
  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch((err) => console.error('Error fetching categories:', err));
  }, []);

  // 2. Fetch Listings when filters change
  const fetchListings = useCallback(async () => {
    setLoadingListings(true);
    try {
      const params = new URLSearchParams();
      if (selectedSchool) {
        params.set('schoolId', selectedSchool.id);
      }
      if (selectedCategoryId) {
        params.set('categoryId', selectedCategoryId);
      }
      if (selectedSubcategoryId) {
        params.set('subcategoryId', selectedSubcategoryId);
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
  }, [selectedSchool, selectedCategoryId, selectedSubcategoryId]);

  useEffect(() => {
    fetchListings();
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

      {/* 3-Tier Cascading Filter */}
      <section aria-label="Filtro de colegios">
        <CascadingSelector
          onSchoolChange={(school) => setSelectedSchool(school)}
          selectedSchoolId={selectedSchool?.id}
        />
      </section>

      {/* Category Filter Tabs */}
      <section className="space-y-4" aria-label="Filtro de categorías">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xs font-bold text-secondary uppercase tracking-[0.14em] flex items-center gap-2">
            <Users className="w-4 h-4 text-mostaza" />
            <span>Rubros de Servicios</span>
          </h2>
          {selectedCategoryId && (
            <button
              onClick={() => {
                setSelectedCategoryId('');
                setSelectedSubcategoryId('');
              }}
              className="text-xs font-display font-semibold uppercase tracking-wider text-coral hover:text-coral-dark"
            >
              Ver todos los rubros
            </button>
          )}
        </div>

        {/* Categories Bar Pills (siempre visibles, con wrap multilínea) */}
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

          {categories.map((cat) => {
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
        </div>

        {/* Subcategories Pills if a category is selected */}
        {selectedCategoryObj && selectedCategoryObj.subcategories.length > 0 && (
          <div className="p-3.5 bg-white rounded-2xl border border-petroleo/10 shadow-xs flex flex-wrap items-center gap-2">
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
