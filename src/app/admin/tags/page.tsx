'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Tag as TagIcon,
  PlusCircle,
  Search,
  Edit3,
  Trash2,
  Save,
  X,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Folder,
  Layers,
  Sparkles,
  Users,
  Wrench,
  Baby,
  GraduationCap,
  Bus,
  PartyPopper,
  Shirt,
  HeartPulse,
  Trophy,
  Home,
  Check,
  HelpCircle,
} from 'lucide-react';
import { slugifyTag } from '@/lib/tags';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  orderIndex: number;
  subcategories?: Array<{
    id: string;
    name: string;
    slug: string;
    orderIndex: number;
  }>;
  _count?: {
    listings: number;
  };
}

interface TagItem {
  id: string;
  name: string;
  slug: string;
  group: string | null;
  orderIndex: number;
  _count?: {
    listings: number;
  };
}

const AVAILABLE_ICONS = [
  { name: 'Wrench', label: 'Arreglos / Oficios', component: Wrench },
  { name: 'Home', label: 'Hogar / Familias', component: Home },
  { name: 'Baby', label: 'Cuidado Infantil', component: Baby },
  { name: 'GraduationCap', label: 'Educación / Clases', component: GraduationCap },
  { name: 'Bus', label: 'Transporte', component: Bus },
  { name: 'PartyPopper', label: 'Eventos / Fiestas', component: PartyPopper },
  { name: 'Shirt', label: 'Uniformes / Ropa', component: Shirt },
  { name: 'HeartPulse', label: 'Salud / Terapias', component: HeartPulse },
  { name: 'Trophy', label: 'Deportes / Arte', component: Trophy },
  { name: 'Layers', label: 'General / Otros', component: Layers },
];

function renderIconByName(iconName?: string | null, className = 'w-4 h-4') {

  switch (iconName) {
    case 'Wrench':
      return <Wrench className={className} />;
    case 'Home':
      return <Home className={className} />;
    case 'Baby':
      return <Baby className={className} />;
    case 'GraduationCap':
      return <GraduationCap className={className} />;
    case 'Bus':
      return <Bus className={className} />;
    case 'PartyPopper':
      return <PartyPopper className={className} />;
    case 'Shirt':
      return <Shirt className={className} />;
    case 'HeartPulse':
      return <HeartPulse className={className} />;
    case 'Trophy':
      return <Trophy className={className} />;
    default:
      return <Layers className={className} />;
  }
}

export default function AdminTagManagerPage() {
  const [activeTab, setActiveTab] = useState<'RUBROS' | 'TAGS'>('RUBROS');

  // Categories / Rubros state
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Tags state
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loadingTags, setLoadingTags] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('');

  // Category Modal State
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catIcon, setCatIcon] = useState('Layers');
  const [catOrderIndex, setCatOrderIndex] = useState<number>(0);
  const [categorySaving, setCategorySaving] = useState(false);

  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatSlug, setEditCatSlug] = useState('');
  const [editCatIcon, setEditCatIcon] = useState('Layers');
  const [editCatOrderIndex, setEditCatOrderIndex] = useState<number>(0);
  const [editCategorySaving, setEditCategorySaving] = useState(false);

  const [deletingCategory, setDeletingCategory] = useState<CategoryItem | null>(null);
  const [deleteCategorySaving, setDeleteCategorySaving] = useState(false);

  // Tag Modal State
  const [showCreateTagModal, setShowCreateTagModal] = useState(false);
  const [createTagName, setCreateTagName] = useState('');
  const [createTagGroup, setCreateTagGroup] = useState('');
  const [createTagSlug, setCreateTagSlug] = useState('');
  const [createTagSaving, setCreateTagSaving] = useState(false);

  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagGroup, setEditTagGroup] = useState('');
  const [editTagSlug, setEditTagSlug] = useState('');
  const [editTagSaving, setEditTagSaving] = useState(false);

  const [deletingTag, setDeletingTag] = useState<TagItem | null>(null);
  const [deleteTagSaving, setDeleteTagSaving] = useState(false);

  // Fetch Categories
  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('No se pudieron cargar los rubros.');
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Fetch Tags
  const fetchTags = async () => {
    setLoadingTags(true);
    try {
      const res = await fetch('/api/tags');
      if (!res.ok) throw new Error('No se pudieron cargar los tags.');
      const data = await res.json();
      setTags(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching tags:', err);
    } finally {
      setLoadingTags(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchTags();
  }, []);

  // Distinct groups for dropdown
  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    // Include names of all categories as primary suggestions
    categories.forEach((c) => set.add(c.name));
    tags.forEach((t) => {
      if (t.group) set.add(t.group);
    });
    return Array.from(set).sort();
  }, [categories, tags]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q)
      );
    });
  }, [categories, searchQuery]);

  // Filtered tags
  const filteredTags = useMemo(() => {
    return tags.filter((t) => {
      const matchesSearch =
        !searchQuery.trim() ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.group && t.group.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesGroup =
        !selectedGroupFilter || t.group === selectedGroupFilter;
      return matchesSearch && matchesGroup;
    });
  }, [tags, searchQuery, selectedGroupFilter]);

  // Category Handlers
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    setCategorySaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: catName.trim(),
          slug: catSlug.trim() || undefined,
          icon: catIcon,
          orderIndex: catOrderIndex,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al crear el rubro.');
      }

      setFeedback({
        type: 'success',
        message: `Rubro "${data.name}" creado con éxito.`,
      });
      setShowCreateCategoryModal(false);
      setCatName('');
      setCatSlug('');
      setCatIcon('Layers');
      await fetchCategories();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'No se pudo crear el rubro.',
      });
    } finally {
      setCategorySaving(false);
    }
  };

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editCatName.trim()) return;

    setEditCategorySaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/categories/${editingCategory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editCatName.trim(),
          slug: editCatSlug.trim() || undefined,
          icon: editCatIcon,
          orderIndex: editCatOrderIndex,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al modificar el rubro.');
      }

      setFeedback({
        type: 'success',
        message: `Rubro "${data.name}" actualizado con éxito.`,
      });
      setEditingCategory(null);
      await fetchCategories();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'No se pudo actualizar el rubro.',
      });
    } finally {
      setEditCategorySaving(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;

    setDeleteCategorySaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/categories/${deletingCategory.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al eliminar el rubro.');
      }

      setFeedback({
        type: 'success',
        message: `Rubro "${deletingCategory.name}" eliminado exitosamente.`,
      });
      setDeletingCategory(null);
      await fetchCategories();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'No se pudo eliminar el rubro.',
      });
    } finally {
      setDeleteCategorySaving(false);
    }
  };

  // Tag Handlers
  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTagName.trim()) return;

    setCreateTagSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createTagName.trim(),
          group: createTagGroup.trim() || null,
          slug: createTagSlug.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al crear el tag.');
      }

      setFeedback({
        type: 'success',
        message: `Tag "${data.name}" creado con éxito.`,
      });
      setShowCreateTagModal(false);
      setCreateTagName('');
      setCreateTagGroup('');
      setCreateTagSlug('');
      await fetchTags();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'No se pudo crear el tag.',
      });
    } finally {
      setCreateTagSaving(false);
    }
  };

  const handleEditTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTag || !editTagName.trim()) return;

    setEditTagSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/tags/${editingTag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editTagName.trim(),
          group: editTagGroup.trim() || null,
          slug: editTagSlug.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al actualizar el tag.');
      }

      setFeedback({
        type: 'success',
        message: `Tag "${data.name}" actualizado con éxito.`,
      });
      setEditingTag(null);
      await fetchTags();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'No se pudo actualizar el tag.',
      });
    } finally {
      setEditTagSaving(false);
    }
  };

  const handleDeleteTag = async () => {
    if (!deletingTag) return;

    setDeleteTagSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/tags/${deletingTag.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al eliminar el tag.');
      }

      setFeedback({
        type: 'success',
        message: `Tag "${deletingTag.name}" eliminado con éxito.`,
      });
      setDeletingTag(null);
      await fetchTags();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'No se pudo eliminar el tag.',
      });
    } finally {
      setDeleteTagSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-slate-900 pb-16 font-sans">
      {/* Header */}
      <header className="bg-petroleo border-b border-petroleo-light shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition shrink-0"
              title="Volver al panel"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Mánager de Tags y Rubros
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider bg-coral text-white shadow-2xs">
                  Taxonomía Escolar
                </span>
              </div>
              <p className="font-display text-[11px] uppercase tracking-[0.14em] text-white/70 mt-0.5">
                Control de Categorías de Alto Nivel y Etiquetas Específicas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => {
                fetchCategories();
                fetchTags();
              }}
              disabled={loadingCategories || loadingTags}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-display font-semibold uppercase tracking-wider transition border border-white/15"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingCategories || loadingTags ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 hover:bg-coral text-white text-xs font-display font-semibold uppercase tracking-wider transition border border-white/15"
            >
              <span>Ver Catálogo</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl text-xs sm:text-sm font-medium flex items-center justify-between gap-3 border shadow-xs animate-in fade-in duration-200 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-xs font-bold hover:underline shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-petroleo/10 shadow-criana flex items-center justify-between">
            <div>
              <span className="text-[11px] font-display font-bold uppercase tracking-wider text-secondary block">
                Rubros / Categorías
              </span>
              <p className="font-serif font-bold text-2xl text-petroleo mt-1">
                {categories.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Categorías de alto nivel</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-petroleo/10 text-petroleo flex items-center justify-center">
              <Layers className="w-6 h-6 text-coral" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-petroleo/10 shadow-criana flex items-center justify-between">
            <div>
              <span className="text-[11px] font-display font-bold uppercase tracking-wider text-secondary block">
                Tags Activos
              </span>
              <p className="font-serif font-bold text-2xl text-petroleo mt-1">
                {tags.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Etiquetas de especialidad</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-arena text-petroleo flex items-center justify-center">
              <TagIcon className="w-6 h-6 text-petroleo" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-petroleo/10 shadow-criana flex items-center justify-between">
            <div>
              <span className="text-[11px] font-display font-bold uppercase tracking-wider text-secondary block">
                Grupos Vinculados
              </span>
              <p className="font-serif font-bold text-2xl text-petroleo mt-1">
                {availableGroups.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Agrupadores de taxonomía</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Folder className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Tab Switcher & Action Toolbar */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-petroleo/10 shadow-criana flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-arena/40 rounded-xl border border-petroleo/10 self-start">
            <button
              type="button"
              onClick={() => {
                setActiveTab('RUBROS');
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-display font-bold uppercase tracking-wider transition ${
                activeTab === 'RUBROS'
                  ? 'bg-petroleo text-white shadow-2xs'
                  : 'text-slate-700 hover:text-petroleo hover:bg-white/60'
              }`}
            >
              <Layers className="w-4 h-4 text-coral" />
              <span>Rubros ({categories.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('TAGS');
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-display font-bold uppercase tracking-wider transition ${
                activeTab === 'TAGS'
                  ? 'bg-petroleo text-white shadow-2xs'
                  : 'text-slate-700 hover:text-petroleo hover:bg-white/60'
              }`}
            >
              <TagIcon className="w-4 h-4 text-mostaza-dark" />
              <span>Tags ({tags.length})</span>
            </button>
          </div>

          {/* Search & Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'RUBROS' ? 'Buscar rubro...' : 'Buscar tag o rubro...'}
                className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-petroleo focus:ring-1 focus:ring-petroleo"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter by group for Tags tab */}
            {activeTab === 'TAGS' && (
              <select
                value={selectedGroupFilter}
                onChange={(e) => setSelectedGroupFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-petroleo focus:ring-1 focus:ring-petroleo"
              >
                <option value="">Todos los rubros ({availableGroups.length})</option>
                {availableGroups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            )}

            {/* Add Button */}
            {activeTab === 'RUBROS' ? (
              <button
                type="button"
                onClick={() => {
                  setCatName('');
                  setCatSlug('');
                  setCatIcon('Layers');
                  setCatOrderIndex(categories.length + 1);
                  setShowCreateCategoryModal(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-petroleo hover:bg-petroleo/90 text-white text-xs font-display font-bold uppercase tracking-wider transition shadow-2xs shrink-0"
              >
                <PlusCircle className="w-4 h-4 text-coral" />
                <span>Nuevo Rubro</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCreateTagName('');
                  setCreateTagGroup(selectedGroupFilter || (categories[0]?.name || ''));
                  setCreateTagSlug('');
                  setShowCreateTagModal(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-petroleo hover:bg-petroleo/90 text-white text-xs font-display font-bold uppercase tracking-wider transition shadow-2xs shrink-0"
              >
                <PlusCircle className="w-4 h-4 text-coral" />
                <span>Nuevo Tag</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB CONTENT: RUBROS */}
        {activeTab === 'RUBROS' && (
          <section className="bg-white rounded-2xl border border-petroleo/10 shadow-criana overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-serif font-bold text-base sm:text-lg text-petroleo">
                  Rubros de Alto Nivel
                </h2>
                <p className="text-xs text-secondary mt-0.5">
                  Categorías principales que articulan los servicios y organizan los tags temáticos.
                </p>
              </div>
              <span className="text-xs font-display font-bold px-3 py-1 rounded-full bg-arena text-petroleo">
                {filteredCategories.length} rubros
              </span>
            </div>

            {loadingCategories ? (
              <div className="p-12 text-center text-secondary text-sm">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-coral" />
                Cargando rubros...
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                No se encontraron rubros que coincidan con la búsqueda.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-petroleo/10 text-petroleo flex items-center justify-center shrink-0">
                        {renderIconByName(cat.icon, 'w-5 h-5 text-coral')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif font-bold text-slate-900 text-sm sm:text-base">
                            {cat.name}
                          </h3>
                          <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                            slug: {cat.slug}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span>
                            Avisos activos: <strong className="text-petroleo">{cat._count?.listings || 0}</strong>
                          </span>
                          <span>•</span>
                          <span>Orden: {cat.orderIndex}</span>
                          {cat.subcategories && cat.subcategories.length > 0 && (
                            <>
                              <span>•</span>
                              <span>{cat.subcategories.length} subcategorías</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategory(cat);
                          setEditCatName(cat.name);
                          setEditCatSlug(cat.slug);
                          setEditCatIcon(cat.icon || 'Layers');
                          setEditCatOrderIndex(cat.orderIndex);
                        }}
                        className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-petroleo transition text-xs font-semibold flex items-center gap-1.5"
                        title="Editar rubro"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingCategory(cat)}
                        className="p-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 transition text-xs font-semibold flex items-center gap-1.5"
                        title="Eliminar rubro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB CONTENT: TAGS */}
        {activeTab === 'TAGS' && (
          <section className="bg-white rounded-2xl border border-petroleo/10 shadow-criana overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-serif font-bold text-base sm:text-lg text-petroleo">
                  Tags y Especialidades
                </h2>
                <p className="text-xs text-secondary mt-0.5">
                  Etiquetas específicas que los usuarios eligen para precisar su servicio (ej: electricidad, plomería, redes).
                </p>
              </div>
              <span className="text-xs font-display font-bold px-3 py-1 rounded-full bg-arena text-petroleo">
                {filteredTags.length} tags
              </span>
            </div>

            {loadingTags ? (
              <div className="p-12 text-center text-secondary text-sm">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-coral" />
                Cargando tags...
              </div>
            ) : filteredTags.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                No se encontraron tags que coincidan con la búsqueda.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-arena text-petroleo flex items-center justify-center shrink-0">
                        <TagIcon className="w-4 h-4 text-coral" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display font-bold text-slate-900 text-sm">
                            #{tag.name}
                          </h3>
                          {tag.group && (
                            <span className="text-[11px] font-semibold text-petroleo bg-petroleo/10 px-2.5 py-0.5 rounded-full">
                              Rubro: {tag.group}
                            </span>
                          )}
                          <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                            slug: {tag.slug}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Avisos asociados: <strong className="text-petroleo">{tag._count?.listings || 0}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTag(tag);
                          setEditTagName(tag.name);
                          setEditTagGroup(tag.group || '');
                          setEditTagSlug(tag.slug);
                        }}
                        className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-petroleo transition text-xs font-semibold flex items-center gap-1.5"
                        title="Editar tag"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingTag(tag)}
                        className="p-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 transition text-xs font-semibold flex items-center gap-1.5"
                        title="Eliminar tag"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* MODAL: CREAR RUBRO */}
      {showCreateCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-coral" />
                <h3 className="font-serif font-bold text-lg text-petroleo">
                  Crear Nuevo Rubro
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateCategoryModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nombre del Rubro <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => {
                    setCatName(e.target.value);
                    if (!catSlug) {
                      setCatSlug(slugifyTag(e.target.value));
                    }
                  }}
                  placeholder="Ej: Arreglos Domésticos"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-petroleo focus:ring-1 focus:ring-petroleo"
                />
              </div>

              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Slug URL (identificador)
                </label>
                <input
                  type="text"
                  value={catSlug}
                  onChange={(e) => setCatSlug(slugifyTag(e.target.value))}
                  placeholder="ej: arreglos-domesticos"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:border-petroleo focus:ring-1 focus:ring-petroleo"
                />
              </div>

              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Ícono Representativo
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {AVAILABLE_ICONS.map((ic) => {
                    const isSelected = catIcon === ic.name;
                    const Comp = ic.component;
                    return (
                      <button
                        key={ic.name}
                        type="button"
                        onClick={() => setCatIcon(ic.name)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                          isSelected
                            ? 'bg-petroleo text-white border-petroleo shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                        title={ic.label}
                      >
                        <Comp className="w-5 h-5" />
                        <span className="text-[9px] leading-tight text-center line-clamp-1">
                          {ic.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateCategoryModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={categorySaving}
                  className="px-5 py-2 rounded-xl bg-petroleo hover:bg-petroleo/90 text-white text-xs font-display font-bold uppercase tracking-wider transition shadow-xs disabled:opacity-50"
                >
                  {categorySaving ? 'Guardando...' : 'Crear Rubro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR RUBRO */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-coral" />
                <h3 className="font-serif font-bold text-lg text-petroleo">
                  Editar Rubro
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nombre del Rubro <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-petroleo focus:ring-1 focus:ring-petroleo"
                />
              </div>

              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Slug URL
                </label>
                <input
                  type="text"
                  value={editCatSlug}
                  onChange={(e) => setEditCatSlug(slugifyTag(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:border-petroleo focus:ring-1 focus:ring-petroleo"
                />
              </div>

              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Ícono Representativo
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {AVAILABLE_ICONS.map((ic) => {
                    const isSelected = editCatIcon === ic.name;
                    const Comp = ic.component;
                    return (
                      <button
                        key={ic.name}
                        type="button"
                        onClick={() => setEditCatIcon(ic.name)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                          isSelected
                            ? 'bg-petroleo text-white border-petroleo shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                        title={ic.label}
                      >
                        <Comp className="w-5 h-5" />
                        <span className="text-[9px] leading-tight text-center line-clamp-1">
                          {ic.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Orden numérico
                </label>
                <input
                  type="number"
                  value={editCatOrderIndex}
                  onChange={(e) => setEditCatOrderIndex(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-petroleo focus:ring-1 focus:ring-petroleo"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editCategorySaving}
                  className="px-5 py-2 rounded-xl bg-petroleo hover:bg-petroleo/90 text-white text-xs font-display font-bold uppercase tracking-wider transition shadow-xs disabled:opacity-50"
                >
                  {editCategorySaving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ELIMINAR RUBRO */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-lg text-slate-900">
              ¿Eliminar rubro &ldquo;{deletingCategory.name}&rdquo;?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Los avisos asociados ({deletingCategory._count?.listings || 0}) quedarán sin categoría asignada pero no serán eliminados.
            </p>

            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteCategorySaving}
                onClick={handleDeleteCategory}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-display font-bold uppercase tracking-wider shadow-xs disabled:opacity-50"
              >
                {deleteCategorySaving ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREAR TAG */}
      {showCreateTagModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <TagIcon className="w-5 h-5 text-coral" />
                <h3 className="font-serif font-bold text-lg text-petroleo">
                  Crear Nuevo Tag
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateTagModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTag} className="space-y-4">
              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nombre del Tag <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createTagName}
                  onChange={(e) => {
                    setCreateTagName(e.target.value);
                    if (!createTagSlug) {
                      setCreateTagSlug(slugifyTag(e.target.value));
                    }
                  }}
                  placeholder="Ej: Electricidad, Plomería, Redes"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-petroleo focus:ring-1 focus:ring-petroleo"
                />
              </div>

              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Rubro Asociado (Grupo)
                </label>
                <select
                  value={createTagGroup}
                  onChange={(e) => setCreateTagGroup(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-petroleo focus:ring-1 focus:ring-petroleo"
                >
                  <option value="">-- Sin rubro específico --</option>
                  {availableGroups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Asociá el tag a uno de los rubros principales (ej: Arreglos Domésticos).
                </p>
              </div>

              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Slug URL
                </label>
                <input
                  type="text"
                  value={createTagSlug}
                  onChange={(e) => setCreateTagSlug(slugifyTag(e.target.value))}
                  placeholder="ej: electricidad"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:border-petroleo focus:ring-1 focus:ring-petroleo"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateTagModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createTagSaving}
                  className="px-5 py-2 rounded-xl bg-petroleo hover:bg-petroleo/90 text-white text-xs font-display font-bold uppercase tracking-wider transition shadow-xs disabled:opacity-50"
                >
                  {createTagSaving ? 'Guardando...' : 'Crear Tag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR TAG */}
      {editingTag && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-coral" />
                <h3 className="font-serif font-bold text-lg text-petroleo">
                  Editar Tag
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTag(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditTag} className="space-y-4">
              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nombre del Tag <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editTagName}
                  onChange={(e) => setEditTagName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-petroleo focus:ring-1 focus:ring-petroleo"
                />
              </div>

              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Rubro Asociado (Grupo)
                </label>
                <select
                  value={editTagGroup}
                  onChange={(e) => setEditTagGroup(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-petroleo focus:ring-1 focus:ring-petroleo"
                >
                  <option value="">-- Sin rubro específico --</option>
                  {availableGroups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Slug URL
                </label>
                <input
                  type="text"
                  value={editTagSlug}
                  onChange={(e) => setEditTagSlug(slugifyTag(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:border-petroleo focus:ring-1 focus:ring-petroleo"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTag(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editTagSaving}
                  className="px-5 py-2 rounded-xl bg-petroleo hover:bg-petroleo/90 text-white text-xs font-display font-bold uppercase tracking-wider transition shadow-xs disabled:opacity-50"
                >
                  {editTagSaving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ELIMINAR TAG */}
      {deletingTag && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-lg text-slate-900">
              ¿Eliminar tag &ldquo;#{deletingTag.name}&rdquo;?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              El tag se desvinculará de los avisos existentes ({deletingTag._count?.listings || 0}). Esta acción no se puede deshacer.
            </p>

            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTag(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteTagSaving}
                onClick={handleDeleteTag}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-display font-bold uppercase tracking-wider shadow-xs disabled:opacity-50"
              >
                {deleteTagSaving ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
