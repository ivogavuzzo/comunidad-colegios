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
} from 'lucide-react';
import { slugifyTag } from '@/lib/tags';

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

export default function AdminTagManagerPage() {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('');

  // Create Tag Modal / Drawer
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createGroup, setCreateGroup] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [createSaving, setCreateSaving] = useState(false);

  // Edit Tag Modal
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editGroup, setEditGroup] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Delete Tag Confirm
  const [deletingTag, setDeletingTag] = useState<TagItem | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const fetchTags = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tags');
      if (!res.ok) {
        throw new Error('No se pudieron cargar los tags.');
      }
      const data = await res.json();
      setTags(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar tags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  // Distinct groups for dropdown
  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    tags.forEach((t) => {
      if (t.group) set.add(t.group);
    });
    return Array.from(set).sort();
  }, [tags]);

  // Filtered tags
  const filteredTags = useMemo(() => {
    return tags.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.group && t.group.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesGroup =
        !selectedGroupFilter || t.group === selectedGroupFilter;
      return matchesSearch && matchesGroup;
    });
  }, [tags, searchQuery, selectedGroupFilter]);

  // Create Tag submit
  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;

    setCreateSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName.trim(),
          group: createGroup.trim() || null,
          slug: createSlug.trim() || undefined,
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
      setShowCreateModal(false);
      setCreateName('');
      setCreateGroup('');
      setCreateSlug('');
      await fetchTags();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'No se pudo crear el tag.',
      });
    } finally {
      setCreateSaving(false);
    }
  };

  // Open Edit
  const openEditModal = (t: TagItem) => {
    setEditingTag(t);
    setEditName(t.name);
    setEditGroup(t.group || '');
    setEditSlug(t.slug);
  };

  // Edit Tag submit
  const handleEditTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTag || !editName.trim()) return;

    setEditSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/tags/${editingTag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          group: editGroup.trim() || null,
          slug: editSlug.trim() || undefined,
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
      setEditSaving(false);
    }
  };

  // Delete Tag
  const handleDeleteTag = async () => {
    if (!deletingTag) return;
    setDeleteSaving(true);
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
        message: data.message || `Tag "${deletingTag.name}" eliminado correctamente.`,
      });
      setDeletingTag(null);
      await fetchTags();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'No se pudo eliminar el tag.',
      });
    } finally {
      setDeleteSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-ivory flex flex-col justify-between">
      <div>
        {/* Header */}
        <header className="bg-petroleo text-white shadow-sm border-b border-petroleo-light">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-arena/20 border border-white/20 rounded-2xl text-mostaza-light">
                <TagIcon className="w-5 h-5 text-mostaza" />
              </div>
              <div>
                <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>Gestor de Tags</span>
                  <span className="text-xs font-display px-2.5 py-0.5 rounded-full bg-coral font-bold uppercase tracking-wider">
                    Tag Manager
                  </span>
                </h1>
                <p className="font-display text-[11px] uppercase tracking-[0.15em] text-white/70">
                  Panel de Administración — Taxonomía y Categorización
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-coral hover:bg-coral-dark text-white text-xs font-display font-bold uppercase tracking-wider transition shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Nuevo Tag</span>
              </button>
              <button
                type="button"
                onClick={fetchTags}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-display font-semibold uppercase tracking-wider transition border border-white/15"
                title="Actualizar lista"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-display font-semibold uppercase tracking-wider transition border border-white/15"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver a Admin</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Feedback message */}
          {feedback && (
            <div
              className={`p-4 rounded-2xl text-sm font-medium flex items-center justify-between gap-3 border shadow-xs ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
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
                className="text-xs font-semibold text-secondary hover:text-black"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-petroleo/10 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-display uppercase tracking-wider text-secondary">
                  Total de Tags
                </span>
                <div className="text-2xl font-serif font-bold text-petroleo mt-1">
                  {tags.length}
                </div>
              </div>
              <div className="p-3 bg-arena/50 rounded-2xl text-petroleo">
                <TagIcon className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-petroleo/10 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-display uppercase tracking-wider text-secondary">
                  Grupos Temáticos
                </span>
                <div className="text-2xl font-serif font-bold text-petroleo mt-1">
                  {availableGroups.length}
                </div>
              </div>
              <div className="p-3 bg-mostaza/20 rounded-2xl text-mostaza">
                <Folder className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-petroleo/10 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-display uppercase tracking-wider text-secondary">
                  Regla de Selección
                </span>
                <div className="text-sm font-sans text-petroleo mt-1 font-medium">
                  Entre 1 y 5 tags por aviso
                </div>
                <div className="text-[11px] text-secondary">
                  (Solo administradores crean tags)
                </div>
              </div>
              <div className="p-3 bg-coral/10 rounded-2xl text-coral">
                <Layers className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search & Group Filter Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-petroleo/10 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar tag por nombre o slug..."
                className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl bg-slate-50 focus:bg-white text-petroleo placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-petroleo/20 focus:border-petroleo"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-black"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-display font-semibold uppercase tracking-wider text-secondary shrink-0">
                Grupo:
              </span>
              <select
                value={selectedGroupFilter}
                onChange={(e) => setSelectedGroupFilter(e.target.value)}
                className="w-full sm:w-64 px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-petroleo/20 focus:border-petroleo"
              >
                <option value="">Todos los grupos ({tags.length})</option>
                {availableGroups.map((grp) => (
                  <option key={grp} value={grp}>
                    {grp}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags Table */}
          <section className="bg-white rounded-3xl border border-petroleo/10 shadow-criana overflow-hidden">
            <div className="px-6 py-4 border-b border-petroleo/10 bg-ivory/60 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-lg font-bold text-petroleo">
                  Listado de Tags Activos ({filteredTags.length})
                </h2>
                <p className="text-xs text-secondary font-sans">
                  Tags disponibles para que las familias clasifiquen sus servicios al publicar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-coral/10 hover:bg-coral text-coral hover:text-white text-xs font-display font-bold uppercase tracking-wider transition border border-coral/20"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Agregar Tag</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-petroleo">
                <thead className="bg-arena/20 text-xs font-display uppercase tracking-wider text-secondary">
                  <tr>
                    <th className="px-6 py-3.5">Nombre del Tag</th>
                    <th className="px-6 py-3.5">Slug</th>
                    <th className="px-6 py-3.5">Grupo Temático</th>
                    <th className="px-6 py-3.5 text-center">Avisos Vinculados</th>
                    <th className="px-6 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-petroleo/5">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-secondary text-sm">
                        <RefreshCw className="w-5 h-5 animate-spin inline-block mr-2 text-coral" />
                        Cargando catálogo de tags...
                      </td>
                    </tr>
                  ) : filteredTags.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-secondary text-sm">
                        No se encontraron tags que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredTags.map((tag) => (
                      <tr key={tag.id} className="hover:bg-arena/20 transition">
                        <td className="px-6 py-4 font-semibold text-petroleo">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-arena/70 border border-petroleo/10 text-xs font-display font-bold text-petroleo">
                            <TagIcon className="w-3 h-3 text-coral" />
                            <span>{tag.name}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-secondary">
                          {tag.slug}
                        </td>
                        <td className="px-6 py-4">
                          {tag.group ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-display font-semibold bg-mostaza/15 text-petroleo">
                              {tag.group}
                            </span>
                          ) : (
                            <span className="text-secondary italic text-xs">Sin grupo</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-xs font-bold font-display bg-slate-100 text-slate-700">
                            {tag._count?.listings ?? 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(tag)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-arena hover:bg-arena/70 text-petroleo text-xs font-display font-semibold uppercase tracking-wider transition"
                              title="Modificar tag"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-secondary" />
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingTag(tag)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-display font-semibold uppercase tracking-wider transition border border-rose-200"
                              title="Eliminar tag"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Eliminar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {/* Modal: Crear Nuevo Tag */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-xl border border-petroleo/10 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-coral/10 rounded-xl text-coral">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <h3 className="font-serif text-lg font-bold text-petroleo">
                  Crear Nuevo Tag
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTag} className="space-y-4">
              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Nombre del Tag <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => {
                    setCreateName(e.target.value);
                    if (!createSlug || createSlug === slugifyTag(createName)) {
                      setCreateSlug(slugifyTag(e.target.value));
                    }
                  }}
                  placeholder="ej: Apoyo en Química, Animación con Magia..."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-petroleo/20 focus:border-petroleo"
                />
              </div>

              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Slug (identificador URL)
                </label>
                <input
                  type="text"
                  value={createSlug}
                  onChange={(e) => setCreateSlug(slugifyTag(e.target.value))}
                  placeholder="ej: apoyo-en-quimica"
                  className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-petroleo/20 focus:border-petroleo"
                />
              </div>

              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Grupo Temático (Rubro)
                </label>
                <div className="space-y-2">
                  <select
                    value={createGroup}
                    onChange={(e) => setCreateGroup(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-petroleo/20 focus:border-petroleo bg-white"
                  >
                    <option value="">-- Seleccionar o escribir abajo --</option>
                    {availableGroups.map((grp) => (
                      <option key={grp} value={grp}>
                        {grp}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={createGroup}
                    onChange={(e) => setCreateGroup(e.target.value)}
                    placeholder="O escribí un nuevo grupo temático..."
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-petroleo"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-display font-semibold uppercase tracking-wider text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createSaving || !createName.trim()}
                  className="px-5 py-2.5 bg-coral hover:bg-coral-dark text-white rounded-full text-xs font-display font-bold uppercase tracking-wider shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{createSaving ? 'Guardando...' : 'Crear Tag'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Tag */}
      {editingTag && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-xl border border-petroleo/10 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-arena rounded-xl text-petroleo">
                  <Edit3 className="w-5 h-5" />
                </div>
                <h3 className="font-serif text-lg font-bold text-petroleo">
                  Modificar Tag
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTag(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditTag} className="space-y-4">
              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Nombre del Tag <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-petroleo/20 focus:border-petroleo"
                />
              </div>

              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Slug (URL identificador)
                </label>
                <input
                  type="text"
                  value={editSlug}
                  onChange={(e) => setEditSlug(slugifyTag(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-petroleo/20 focus:border-petroleo"
                />
              </div>

              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Grupo Temático
                </label>
                <div className="space-y-2">
                  <select
                    value={editGroup}
                    onChange={(e) => setEditGroup(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-petroleo/20 focus:border-petroleo bg-white"
                  >
                    <option value="">-- Sin grupo o escribir abajo --</option>
                    {availableGroups.map((grp) => (
                      <option key={grp} value={grp}>
                        {grp}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={editGroup}
                    onChange={(e) => setEditGroup(e.target.value)}
                    placeholder="O editá el grupo temático..."
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-petroleo"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTag(null)}
                  className="px-4 py-2 text-xs font-display font-semibold uppercase tracking-wider text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editSaving || !editName.trim()}
                  className="px-5 py-2.5 bg-petroleo hover:bg-petroleo-light text-white rounded-full text-xs font-display font-bold uppercase tracking-wider shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Eliminar Tag */}
      {deletingTag && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-xl border border-rose-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-slate-900">
                  ¿Eliminar este tag?
                </h3>
                <p className="text-xs text-slate-500 font-sans">
                  Esta acción eliminará el tag del catálogo de opciones.
                </p>
              </div>
            </div>

            <div className="p-4 bg-rose-50/70 border border-rose-100 rounded-2xl text-xs text-rose-900 space-y-1">
              <p>
                <strong>Tag a eliminar:</strong> &ldquo;{deletingTag.name}&rdquo; ({deletingTag.slug})
              </p>
              {deletingTag._count && deletingTag._count.listings > 0 && (
                <p className="text-rose-700 font-medium">
                  ⚠️ Hay <strong>{deletingTag._count.listings} avisos</strong> vinculados a este tag. Se desvincularán automáticamente.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTag(null)}
                className="px-4 py-2 text-xs font-display font-semibold uppercase tracking-wider text-slate-600 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteSaving}
                onClick={handleDeleteTag}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-display font-bold uppercase tracking-wider shadow-sm transition disabled:opacity-50"
              >
                {deleteSaving ? 'Eliminando...' : 'Sí, eliminar tag'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
