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

  // Category Icon helper
  const renderCategoryIcon = (slug: string) => {
    const iconClass = 'w-4 h-4';
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      {/* Hero Section */}
      <section className="text-center py-6 sm:py-8 max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-rose-600" />
          <span>Comunidad Escolar AMBA</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Servicios y recomendaciones entre familias de colegios
        </h1>
        <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
          Encontrá niñeras pedagógicas, apoyo escolar, traslados, viandas y más, compartidos
          directamente por familias de tu comunidad educativa.
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
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-rose-500" />
            <span>Rubros de Servicios</span>
          </h2>
          {selectedCategoryId && (
            <button
              onClick={() => {
                setSelectedCategoryId('');
                setSelectedSubcategoryId('');
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-medium"
            >
              Ver todas las categorías
            </button>
          )}
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setSelectedCategoryId('');
              setSelectedSubcategoryId('');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition ${
              !selectedCategoryId
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Todos los rubros</span>
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryChange(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition ${
                  isSelected
                    ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/30'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
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
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex flex-wrap items-center gap-2 animate-fade-in">
            <span className="text-xs font-semibold text-slate-500 mr-1">Especialidad:</span>
            <button
              type="button"
              onClick={() => setSelectedSubcategoryId('')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                !selectedSubcategoryId
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                    isSubSelected
                      ? 'bg-rose-600 text-white font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
