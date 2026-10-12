'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  User as UserIcon,
  Trash2,
  RefreshCw,
  ExternalLink,
  ArrowLeft,
  Calendar,
  School as SchoolIcon,
  Tag as TagIcon,
  BarChart3,
  Eye,
  X,
  AlertTriangle,
  FileText,
  Clock,
  Sparkles,
  Phone,
  Mail,
  Globe,
  SlidersHorizontal,
} from 'lucide-react';

interface UserListing {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  whatsapp?: string | null;
  email?: string | null;
  webUrl?: string | null;
  workZone?: string | null;
  workNeighborhood?: string | null;
  category?: { id: string; name: string; slug: string } | null;
  subcategory?: { id: string; name: string; slug: string } | null;
  school?: { id: string; nombre: string } | null;
  tags: Array<{
    tag: {
      id: string;
      name: string;
      slug: string;
      group?: string | null;
    };
  }>;
  _count?: {
    clicks: number;
  };
}

interface UserItem {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  dni: string | null;
  role: string; // 'USER' | 'ADMIN'
  isActive: boolean;
  isOnboarded: boolean;
  createdAt: string;
  updatedAt: string;
  schoolOfOrigin: {
    id: string;
    nombre: string;
    localidad: string;
    departamento: string;
    jurisdiccion: string;
  } | null;
  _count?: {
    listings: number;
  };
  listings: UserListing[];
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'USER' | 'ADMIN'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'listings-desc' | 'name-asc'>('date-desc');

  // Modals
  const [viewingUser, setViewingUser] = useState<UserItem | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) {
        throw new Error(`Error ${res.status}: No se pudieron cargar los usuarios`);
      }
      const data = await res.json();
      setUsers(data);
      // If modal is open, refresh viewingUser with latest data
      if (viewingUser) {
        const refreshed = data.find((u: UserItem) => u.id === viewingUser.id);
        if (refreshed) {
          setViewingUser(refreshed);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // Auto refresh when admin switches tabs/returns to window so newly signed up users appear immediately
    const onFocus = () => {
      fetchUsers();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Extract distinct schools and tags from users for quick filter dropdowns
  const availableSchools = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => {
      if (u.schoolOfOrigin) {
        map.set(u.schoolOfOrigin.id, u.schoolOfOrigin.nombre);
      }
      u.listings.forEach((l) => {
        if (l.school) {
          map.set(l.school.id, l.school.nombre);
        }
      });
    });
    return Array.from(map.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [users]);

  const availableTags = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => {
      u.listings.forEach((l) => {
        l.tags.forEach((t) => {
          map.set(t.tag.slug, t.tag.name);
        });
      });
    });
    return Array.from(map.entries())
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  // Filtered & sorted users
  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        // Search by name, email, DNI
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const nameMatch = u.name?.toLowerCase().includes(q);
          const emailMatch = u.email.toLowerCase().includes(q);
          const dniMatch = u.dni?.toLowerCase().includes(q);
          const schoolMatch = u.schoolOfOrigin?.nombre.toLowerCase().includes(q);
          if (!nameMatch && !emailMatch && !dniMatch && !schoolMatch) {
            return false;
          }
        }

        // School filter
        if (selectedSchool) {
          const originMatch = u.schoolOfOrigin?.id === selectedSchool;
          const listingMatch = u.listings.some((l) => l.school?.id === selectedSchool);
          if (!originMatch && !listingMatch) return false;
        }

        // Tag filter (ad tags)
        if (selectedTag) {
          const hasTag = u.listings.some((l) =>
            l.tags.some((t) => t.tag.slug === selectedTag || t.tag.name.toLowerCase() === selectedTag.toLowerCase())
          );
          if (!hasTag) return false;
        }

        // Creation date range
        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          if (new Date(u.createdAt) < fromDate) return false;
        }
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (new Date(u.createdAt) > toDate) return false;
        }

        // Role filter
        if (roleFilter !== 'ALL' && u.role !== roleFilter) {
          return false;
        }

        // Status filter
        if (statusFilter === 'ACTIVE' && u.isActive === false) {
          return false;
        }
        if (statusFilter === 'DISABLED' && u.isActive !== false) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'date-asc') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === 'listings-desc') {
          const aCount = a._count?.listings ?? a.listings.length;
          const bCount = b._count?.listings ?? b.listings.length;
          return bCount - aCount;
        }
        if (sortBy === 'name-asc') {
          return (a.name || a.email).localeCompare(b.name || b.email);
        }
        return 0;
      });
  }, [
    users,
    searchQuery,
    selectedSchool,
    selectedTag,
    dateFrom,
    dateTo,
    roleFilter,
    statusFilter,
    sortBy,
  ]);

  // Metrics summary
  const summary = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.isActive !== false).length;
    const disabledUsers = users.filter((u) => u.isActive === false).length;
    const adminCount = users.filter((u) => u.role === 'ADMIN').length;
    const familyCount = users.filter((u) => u.role !== 'ADMIN').length;
    const totalListings = users.reduce((acc, u) => acc + (u._count?.listings ?? u.listings.length), 0);
    return {
      totalUsers,
      activeUsers,
      disabledUsers,
      adminCount,
      familyCount,
      totalListings,
    };
  }, [users]);

  // Reset filters
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedSchool('');
    setSelectedTag('');
    setDateFrom('');
    setDateTo('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setSortBy('date-desc');
  };

  // Toggle user active / disabled
  const handleToggleStatus = async (user: UserItem) => {
    setActionLoading(user.id);
    setFeedback(null);
    const newStatus = !user.isActive;
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al cambiar estado del usuario.');
      }
      setFeedback({
        type: 'success',
        message: newStatus
          ? `Usuario "${user.name || user.email}" habilitado exitosamente.`
          : `Usuario "${user.name || user.email}" deshabilitado. No podrá iniciar sesión ni publicar.`,
      });
      await fetchUsers();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error al actualizar estado del usuario.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Change user profile / role (ADMIN <-> USER / Familia)
  const handleRoleChange = async (user: UserItem, newRole: 'ADMIN' | 'USER') => {
    setActionLoading(user.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al cambiar rol del usuario.');
      }
      setFeedback({
        type: 'success',
        message:
          newRole === 'ADMIN'
            ? `Perfil actualizado: "${user.name || user.email}" ahora es Administrador.`
            : `Perfil actualizado: "${user.name || user.email}" ahora tiene perfil Familia.`,
      });
      await fetchUsers();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error al actualizar rol del usuario.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setDeleteSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/users/${deletingUser.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al eliminar usuario.');
      }
      setFeedback({
        type: 'success',
        message: `Usuario "${deletingUser.name || deletingUser.email}" eliminado exitosamente. Sus avisos fueron removidos y podrá volver a registrarse con Google si lo desea.`,
      });
      if (viewingUser?.id === deletingUser.id) {
        setViewingUser(null);
      }
      setDeletingUser(null);
      await fetchUsers();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error al eliminar usuario.',
      });
    } finally {
      setDeleteSaving(false);
    }
  };

  const hasActiveFilters =
    Boolean(searchQuery) ||
    Boolean(selectedSchool) ||
    Boolean(selectedTag) ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    roleFilter !== 'ALL' ||
    statusFilter !== 'ALL';

  return (
    <div className="min-h-screen bg-ivory flex flex-col justify-between">
      <div>
        {/* Top Header */}
        <header className="bg-petroleo text-white shadow-sm border-b border-petroleo-light">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-arena/20 border border-white/20 rounded-2xl text-mostaza-light">
                <Users className="w-5 h-5 text-mostaza" />
              </div>
              <div>
                <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>Control de Usuarios</span>
                  <span className="text-xs font-display px-2.5 py-0.5 rounded-full bg-coral font-bold uppercase tracking-wider text-white">
                    Admin
                  </span>
                </h1>
                <p className="font-display text-[11px] uppercase tracking-[0.15em] text-white/70">
                  Gestión de accesos, roles, colegios y avisos de la comunidad
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={fetchUsers}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-display font-semibold uppercase tracking-wider transition border border-white/15"
                title="Actualizar tabla de usuarios en tiempo real"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Actualizar</span>
              </button>

              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-display font-semibold uppercase tracking-wider transition border border-white/15"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Panel Estadísticas</span>
              </Link>

              <Link
                href="/admin/tags"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-display font-semibold uppercase tracking-wider transition border border-white/15"
              >
                <TagIcon className="w-3.5 h-3.5" />
                <span>Gestor de Tags</span>
              </Link>

              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 hover:bg-coral text-white text-xs font-display font-semibold uppercase tracking-wider transition border border-white/15"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Catálogo</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Feedback alert */}
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
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-xs text-secondary hover:text-black font-semibold"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* KPI Summary Cards */}
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-petroleo/10 shadow-xs">
              <span className="text-[11px] font-display uppercase tracking-wider text-secondary block">
                Total Usuarios
              </span>
              <span className="text-2xl font-serif font-bold text-petroleo mt-1 block">
                {summary.totalUsers}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-petroleo/10 shadow-xs">
              <span className="text-[11px] font-display uppercase tracking-wider text-secondary block">
                Habilitados
              </span>
              <span className="text-2xl font-serif font-bold text-emerald-600 mt-1 block">
                {summary.activeUsers}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-petroleo/10 shadow-xs">
              <span className="text-[11px] font-display uppercase tracking-wider text-secondary block">
                Deshabilitados
              </span>
              <span className="text-2xl font-serif font-bold text-rose-600 mt-1 block">
                {summary.disabledUsers}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-petroleo/10 shadow-xs">
              <span className="text-[11px] font-display uppercase tracking-wider text-secondary block">
                Familias
              </span>
              <span className="text-2xl font-serif font-bold text-petroleo mt-1 block">
                {summary.familyCount}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-petroleo/10 shadow-xs">
              <span className="text-[11px] font-display uppercase tracking-wider text-secondary block">
                Administradores
              </span>
              <span className="text-2xl font-serif font-bold text-coral mt-1 block">
                {summary.adminCount}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-petroleo/10 shadow-xs">
              <span className="text-[11px] font-display uppercase tracking-wider text-secondary block">
                Avisos Publicados
              </span>
              <span className="text-2xl font-serif font-bold text-mostaza mt-1 block">
                {summary.totalListings}
              </span>
            </div>
          </section>

          {/* Search & Filter Toolbar */}
          <section className="bg-white rounded-3xl p-5 border border-petroleo/10 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-petroleo">
                <SlidersHorizontal className="w-4 h-4 text-coral" />
                <h2 className="font-serif font-bold text-base">Filtros y Búsqueda de Usuarios</h2>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs text-coral hover:text-coral-dark font-display font-semibold uppercase tracking-wider inline-flex items-center gap-1 transition"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Limpiar filtros</span>
                </button>
              )}
            </div>

            {/* Filter inputs grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Buscador de usuarios */}
              <div className="relative">
                <label className="block text-[11px] font-display uppercase tracking-wider text-secondary mb-1">
                  Buscador (Nombre, Email, DNI)
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-secondary/60 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar usuario o DNI..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-arena/20 border border-petroleo/15 rounded-xl text-petroleo placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-coral/40"
                    data-testid="user-search-input"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary hover:text-petroleo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Búsqueda por Colegio */}
              <div>
                <label className="block text-[11px] font-display uppercase tracking-wider text-secondary mb-1">
                  Filtrar por Colegio
                </label>
                <div className="relative">
                  <SchoolIcon className="w-4 h-4 text-secondary/60 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={selectedSchool}
                    onChange={(e) => setSelectedSchool(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-arena/20 border border-petroleo/15 rounded-xl text-petroleo focus:outline-none focus:ring-2 focus:ring-coral/40 appearance-none truncate"
                    data-testid="school-filter-select"
                  >
                    <option value="">Todos los colegios</option>
                    {availableSchools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Búsqueda por Tags de su aviso */}
              <div>
                <label className="block text-[11px] font-display uppercase tracking-wider text-secondary mb-1">
                  Filtrar por Tags del aviso
                </label>
                <div className="relative">
                  <TagIcon className="w-4 h-4 text-secondary/60 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-arena/20 border border-petroleo/15 rounded-xl text-petroleo focus:outline-none focus:ring-2 focus:ring-coral/40 appearance-none truncate"
                    data-testid="tag-filter-select"
                  >
                    <option value="">Todos los tags</option>
                    {availableTags.map((t) => (
                      <option key={t.slug} value={t.slug}>
                        #{t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ordenamiento */}
              <div>
                <label className="block text-[11px] font-display uppercase tracking-wider text-secondary mb-1">
                  Ordenar por
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-arena/20 border border-petroleo/15 rounded-xl text-petroleo focus:outline-none focus:ring-2 focus:ring-coral/40"
                >
                  <option value="date-desc">Fecha de alta: Más recientes primero</option>
                  <option value="date-asc">Fecha de alta: Más antiguos primero</option>
                  <option value="listings-desc">Mayor cantidad de avisos</option>
                  <option value="name-asc">Nombre alfabético (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Second row: Dates & Rol & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1 border-t border-petroleo/5">
              {/* Fecha Desde */}
              <div>
                <label className="block text-[11px] font-display uppercase tracking-wider text-secondary mb-1">
                  Fecha Alta Desde
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-secondary/60 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-arena/20 border border-petroleo/15 rounded-xl text-petroleo focus:outline-none focus:ring-2 focus:ring-coral/40"
                    data-testid="date-from-input"
                  />
                </div>
              </div>

              {/* Fecha Hasta */}
              <div>
                <label className="block text-[11px] font-display uppercase tracking-wider text-secondary mb-1">
                  Fecha Alta Hasta
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-secondary/60 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-arena/20 border border-petroleo/15 rounded-xl text-petroleo focus:outline-none focus:ring-2 focus:ring-coral/40"
                    data-testid="date-to-input"
                  />
                </div>
              </div>

              {/* Profile / Rol filter */}
              <div>
                <label className="block text-[11px] font-display uppercase tracking-wider text-secondary mb-1">
                  Perfil (Rol)
                </label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-arena/20 border border-petroleo/15 rounded-xl text-petroleo focus:outline-none focus:ring-2 focus:ring-coral/40"
                >
                  <option value="ALL">Todos los perfiles</option>
                  <option value="USER">Familia (Usuarios)</option>
                  <option value="ADMIN">Administradores</option>
                </select>
              </div>

              {/* Estado filter */}
              <div>
                <label className="block text-[11px] font-display uppercase tracking-wider text-secondary mb-1">
                  Estado
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-arena/20 border border-petroleo/15 rounded-xl text-petroleo focus:outline-none focus:ring-2 focus:ring-coral/40"
                >
                  <option value="ALL">Todos los estados</option>
                  <option value="ACTIVE">Solo Habilitados</option>
                  <option value="DISABLED">Solo Deshabilitados</option>
                </select>
              </div>
            </div>
          </section>

          {/* Users Table */}
          <section className="bg-white rounded-3xl border border-petroleo/10 shadow-criana overflow-hidden">
            <div className="px-6 py-5 border-b border-petroleo/10 bg-ivory/80 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-lg font-bold text-petroleo">
                  Listado de Usuarios Registrados
                </h2>
                <p className="text-xs text-secondary font-sans">
                  Mostrando {filteredUsers.length} de {users.length} usuario{users.length === 1 ? '' : 's'}. Se actualiza automáticamente con cada alta.
                </p>
              </div>
              <span className="text-xs font-display font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-arena text-petroleo">
                {filteredUsers.length} resultado{filteredUsers.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-petroleo" data-testid="users-table">
                <thead className="bg-arena/20 text-xs font-display uppercase tracking-wider text-secondary">
                  <tr>
                    <th className="px-6 py-3.5">Usuario</th>
                    <th className="px-6 py-3.5">Colegio Origen</th>
                    <th className="px-6 py-3.5">Perfil (Rol)</th>
                    <th className="px-6 py-3.5">Estado</th>
                    <th className="px-6 py-3.5 text-center">Avisos</th>
                    <th className="px-6 py-3.5">Fecha Alta</th>
                    <th className="px-6 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-petroleo/5">
                  {loading && users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-secondary">
                        <div className="inline-block animate-spin rounded-full h-7 w-7 border-3 border-coral border-t-transparent mb-2"></div>
                        <p className="text-xs">Cargando base de usuarios...</p>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-secondary text-sm">
                        No se encontraron usuarios que coincidan con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const adCount = user._count?.listings ?? user.listings.length;
                      const formattedDate = new Date(user.createdAt).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      });
                      const formattedTime = new Date(user.createdAt).toLocaleTimeString('es-AR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <tr
                          key={user.id}
                          className="hover:bg-arena/20 transition group"
                          data-testid={`user-row-${user.id}`}
                        >
                          {/* Usuario (Avatar + Nombre + Email + DNI) */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {user.image ? (
                                <img
                                  src={user.image}
                                  alt={user.name || 'Avatar'}
                                  className="w-9 h-9 rounded-full object-cover border border-petroleo/15 shrink-0"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-arena text-petroleo font-bold text-xs flex items-center justify-center border border-petroleo/15 shrink-0">
                                  {(user.name?.[0] || user.email[0] || 'U').toUpperCase()}
                                </div>
                              )}
                              <div>
                                <button
                                  type="button"
                                  onClick={() => setViewingUser(user)}
                                  className="font-serif font-bold text-petroleo hover:text-coral transition-colors text-left flex items-center gap-1.5"
                                  title="Abrir perfil y avisos del usuario"
                                >
                                  <span>{user.name || 'Sin nombre registrado'}</span>
                                </button>
                                <span className="text-xs text-secondary font-sans block">
                                  {user.email}
                                </span>
                                {user.dni && (
                                  <span className="text-[11px] text-secondary/80 font-display block">
                                    DNI: {user.dni}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Colegio de procedencia */}
                          <td className="px-6 py-4">
                            {user.schoolOfOrigin ? (
                              <div>
                                <span className="font-semibold text-xs text-petroleo block max-w-[200px] truncate">
                                  {user.schoolOfOrigin.nombre}
                                </span>
                                <span className="text-[11px] text-secondary font-sans block">
                                  {user.schoolOfOrigin.jurisdiccion} - {user.schoolOfOrigin.departamento}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-secondary/60 italic">
                                Sin colegio asignado
                              </span>
                            )}
                          </td>

                          {/* Profile / Rol (Admin o Familia) */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {user.role === 'ADMIN' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-display font-bold bg-petroleo text-white shadow-2xs">
                                  <ShieldCheck className="w-3 h-3 text-mostaza" />
                                  Admin
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-display font-semibold bg-arena text-petroleo border border-petroleo/15">
                                  <UserIcon className="w-3 h-3 text-coral" />
                                  Familia
                                </span>
                              )}

                              {/* Selector rápido de rol */}
                              <select
                                value={user.role}
                                disabled={actionLoading === user.id}
                                onChange={(e) =>
                                  handleRoleChange(user, e.target.value as 'ADMIN' | 'USER')
                                }
                                className="text-[11px] font-sans py-0.5 px-1.5 rounded-lg border border-petroleo/15 bg-white text-secondary hover:text-petroleo focus:outline-none focus:ring-1 focus:ring-coral cursor-pointer"
                                title="Cambiar perfil (Admin o Familia)"
                                data-testid={`role-select-${user.id}`}
                              >
                                <option value="USER">Familia</option>
                                <option value="ADMIN">Admin</option>
                              </select>
                            </div>
                          </td>

                          {/* Estado (Habilitado / Deshabilitado) */}
                          <td className="px-6 py-4">
                            {user.isActive !== false ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-display font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Habilitado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-display font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                Deshabilitado
                              </span>
                            )}
                          </td>

                          {/* Contador de Avisos (Vista Previa) */}
                          <td className="px-6 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => setViewingUser(user)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-display font-bold transition shadow-2xs ${
                                adCount > 0
                                  ? 'bg-mostaza/15 text-mostaza-dark border border-mostaza/30 hover:bg-mostaza hover:text-white'
                                  : 'bg-arena/50 text-secondary border border-petroleo/10 hover:bg-arena'
                              }`}
                              title="Ver avisos publicados por este usuario"
                              data-testid={`user-ad-counter-${user.id}`}
                            >
                              <FileText className="w-3 h-3" />
                              <span>{adCount} {adCount === 1 ? 'aviso' : 'avisos'}</span>
                            </button>
                          </td>

                          {/* Fecha de creación */}
                          <td className="px-6 py-4 text-secondary text-xs font-sans whitespace-nowrap">
                            <div>{formattedDate}</div>
                            <div className="text-[10px] text-secondary/70">{formattedTime}</div>
                          </td>

                          {/* Acciones */}
                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {/* Ver perfil y avisos */}
                              <button
                                type="button"
                                onClick={() => setViewingUser(user)}
                                className="p-1.5 rounded-full hover:bg-arena text-petroleo transition"
                                title="Ver perfil completo y avisos"
                                data-testid={`view-profile-btn-${user.id}`}
                              >
                                <Eye className="w-4 h-4 text-secondary" />
                              </button>

                              {/* Habilitar / Deshabilitar */}
                              <button
                                type="button"
                                disabled={actionLoading === user.id}
                                onClick={() => handleToggleStatus(user)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-display font-semibold uppercase tracking-wider transition ${
                                  user.isActive !== false
                                    ? 'bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 border border-slate-200'
                                    : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300'
                                }`}
                                title={
                                  user.isActive !== false
                                    ? 'Deshabilitar cuenta de usuario'
                                    : 'Habilitar cuenta de usuario'
                                }
                                data-testid={`toggle-status-btn-${user.id}`}
                              >
                                {user.isActive !== false ? 'Deshabilitar' : 'Habilitar'}
                              </button>

                              {/* Eliminar usuario */}
                              <button
                                type="button"
                                onClick={() => setDeletingUser(user)}
                                className="p-1.5 rounded-full hover:bg-rose-50 text-secondary hover:text-rose-600 transition"
                                title="Eliminar usuario (podrá volver a registrarse con Google)"
                                data-testid={`delete-user-btn-${user.id}`}
                              >
                                <Trash2 className="w-4 h-4 text-rose-500" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {/* ============================================================== */}
      {/* MODAL / DRAWER: PERFIL DEL USUARIO Y DETALLE DE SUS AVISOS     */}
      {/* ============================================================== */}
      {viewingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-petroleo/60 backdrop-blur-xs animate-in fade-in"
          data-testid="user-profile-modal"
        >
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-petroleo/10 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-arena/40 border-b border-petroleo/10 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                {viewingUser.image ? (
                  <img
                    src={viewingUser.image}
                    alt={viewingUser.name || 'Avatar'}
                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-petroleo text-white font-bold text-lg flex items-center justify-center shadow-xs shrink-0">
                    {(viewingUser.name?.[0] || viewingUser.email[0] || 'U').toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="font-serif text-xl font-bold text-petroleo">
                    {viewingUser.name || 'Usuario Criana'}
                  </h3>
                  <p className="text-xs text-secondary font-sans">{viewingUser.email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="p-1.5 rounded-full hover:bg-white/80 text-secondary hover:text-black transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* User meta cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-arena/20 p-3.5 rounded-2xl border border-petroleo/10">
                  <span className="text-[10px] font-display uppercase tracking-wider text-secondary block">
                    Perfil / Rol
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-sm font-semibold text-petroleo">
                      {viewingUser.role === 'ADMIN' ? 'Administrador' : 'Familia'}
                    </span>
                    <button
                      type="button"
                      disabled={actionLoading === viewingUser.id}
                      onClick={() =>
                        handleRoleChange(
                          viewingUser,
                          viewingUser.role === 'ADMIN' ? 'USER' : 'ADMIN'
                        )
                      }
                      className="text-[10px] text-coral hover:underline font-semibold"
                    >
                      (Cambiar a {viewingUser.role === 'ADMIN' ? 'Familia' : 'Admin'})
                    </button>
                  </div>
                </div>

                <div className="bg-arena/20 p-3.5 rounded-2xl border border-petroleo/10">
                  <span className="text-[10px] font-display uppercase tracking-wider text-secondary block">
                    Estado de Cuenta
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`text-xs font-display font-bold px-2 py-0.5 rounded-full ${
                        viewingUser.isActive !== false
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {viewingUser.isActive !== false ? 'Habilitado' : 'Deshabilitado'}
                    </span>
                    <button
                      type="button"
                      disabled={actionLoading === viewingUser.id}
                      onClick={() => handleToggleStatus(viewingUser)}
                      className="text-[10px] text-secondary hover:text-petroleo underline font-semibold"
                    >
                      ({viewingUser.isActive !== false ? 'Deshabilitar' : 'Habilitar'})
                    </button>
                  </div>
                </div>

                <div className="bg-arena/20 p-3.5 rounded-2xl border border-petroleo/10">
                  <span className="text-[10px] font-display uppercase tracking-wider text-secondary block">
                    Fecha de Registro
                  </span>
                  <span className="text-xs font-semibold text-petroleo mt-1 block">
                    {new Date(viewingUser.createdAt).toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* Extra details (DNI, School) */}
              <div className="bg-ivory p-4 rounded-2xl border border-petroleo/10 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-secondary font-display uppercase tracking-wider text-[10px] block">
                    Colegio de Procedencia:
                  </span>
                  <span className="font-semibold text-petroleo text-sm mt-0.5 block">
                    {viewingUser.schoolOfOrigin?.nombre || 'No especificado aún'}
                  </span>
                  {viewingUser.schoolOfOrigin && (
                    <span className="text-secondary text-[11px]">
                      {viewingUser.schoolOfOrigin.jurisdiccion} • {viewingUser.schoolOfOrigin.departamento}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-secondary font-display uppercase tracking-wider text-[10px] block">
                    Documento Nacional de Identidad (DNI):
                  </span>
                  <span className="font-semibold text-petroleo text-sm mt-0.5 block">
                    {viewingUser.dni || 'No completado'}
                  </span>
                  <span className="text-secondary text-[11px]">
                    Onboarding: {viewingUser.isOnboarded ? 'Completado' : 'Pendiente'}
                  </span>
                </div>
              </div>

              {/* User Listings Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-petroleo/10 pb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-coral" />
                    <h4 className="font-serif font-bold text-petroleo text-base">
                      Avisos Publicados por el Usuario
                    </h4>
                  </div>
                  <span className="text-xs font-display font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-arena text-petroleo">
                    {viewingUser.listings.length} aviso{viewingUser.listings.length === 1 ? '' : 's'}
                  </span>
                </div>

                {viewingUser.listings.length === 0 ? (
                  <div className="text-center py-8 bg-arena/10 rounded-2xl border border-dashed border-petroleo/20">
                    <FileText className="w-8 h-8 text-secondary/40 mx-auto mb-2" />
                    <p className="text-sm text-secondary font-sans">
                      Este usuario aún no ha publicado ningún aviso en la comunidad.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {viewingUser.listings.map((listing) => {
                      const isApproved = listing.status === 'APPROVED';
                      const isPending = listing.status === 'PENDING';
                      const isRejected = listing.status === 'REJECTED';
                      const isHidden = listing.status === 'HIDDEN';

                      return (
                        <div
                          key={listing.id}
                          className="bg-white p-4 rounded-2xl border border-petroleo/10 hover:border-petroleo/25 transition shadow-2xs space-y-2.5"
                          data-testid={`user-listing-item-${listing.id}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <Link
                                href={`/servicios/${listing.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-serif font-bold text-sm sm:text-base text-petroleo hover:text-coral transition-colors flex items-center gap-1.5"
                              >
                                <span>{listing.title}</span>
                                <ExternalLink className="w-3.5 h-3.5 text-secondary" />
                              </Link>
                              <p className="text-xs text-secondary line-clamp-2 mt-0.5">
                                {listing.description}
                              </p>
                            </div>

                            {/* Status badge */}
                            <span className="shrink-0">
                              {isApproved && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-display font-semibold bg-emerald-100 text-emerald-800">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Activo
                                </span>
                              )}
                              {isPending && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-display font-semibold bg-amber-100 text-amber-800">
                                  <Clock className="w-3 h-3" />
                                  Pendiente
                                </span>
                              )}
                              {isRejected && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-display font-semibold bg-rose-100 text-rose-800">
                                  <XCircle className="w-3 h-3" />
                                  Rechazado
                                </span>
                              )}
                              {isHidden && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-display font-semibold bg-slate-100 text-slate-700">
                                  Oculto
                                </span>
                              )}
                            </span>
                          </div>

                          {/* Category & School & Clicks */}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-secondary">
                            {listing.category && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-arena text-petroleo text-[11px] font-display font-semibold">
                                {listing.category.name}
                              </span>
                            )}
                            {listing.school && (
                              <span className="inline-flex items-center gap-1 text-[11px]">
                                <SchoolIcon className="w-3 h-3 text-secondary" />
                                {listing.school.nombre}
                              </span>
                            )}
                            {listing._count?.clicks !== undefined && (
                              <span className="text-[11px] font-semibold text-coral">
                                • {listing._count.clicks} clics recibidos
                              </span>
                            )}
                          </div>

                          {/* Tags */}
                          {listing.tags && listing.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {listing.tags.map((t) => (
                                <span
                                  key={t.tag.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-ivory text-petroleo border border-petroleo/10"
                                >
                                  <TagIcon className="w-2.5 h-2.5 text-mostaza" />
                                  <span>{t.tag.name}</span>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Contact channels */}
                          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-petroleo/5 text-[11px] text-secondary">
                            {listing.whatsapp && (
                              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                                <Phone className="w-3 h-3" />
                                {listing.whatsapp}
                              </span>
                            )}
                            {listing.email && (
                              <span className="flex items-center gap-1 text-indigo-700 font-medium">
                                <Mail className="w-3 h-3" />
                                {listing.email}
                              </span>
                            )}
                            {listing.webUrl && (
                              <span className="flex items-center gap-1 text-purple-700 font-medium">
                                <Globe className="w-3 h-3" />
                                {listing.webUrl}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-arena/20 border-t border-petroleo/10 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setDeletingUser(viewingUser);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display font-semibold uppercase tracking-wider text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Usuario</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="px-4 py-2 rounded-full bg-petroleo hover:bg-petroleo-light text-white text-xs font-display font-semibold uppercase tracking-wider transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CONFIRMACIÓN DE ELIMINACIÓN DE USUARIO                  */}
      {/* ============================================================== */}
      {deletingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-petroleo/60 backdrop-blur-xs animate-in fade-in"
          data-testid="delete-user-modal"
        >
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-petroleo/10 overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-2xl bg-rose-50 border border-rose-200">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-petroleo">
                  ¿Eliminar este usuario?
                </h3>
                <span className="text-xs text-rose-600 font-display font-semibold uppercase tracking-wider">
                  Acción irreversible
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-secondary font-sans leading-relaxed">
              Estás a punto de eliminar a{' '}
              <strong className="text-petroleo">{deletingUser.name || deletingUser.email}</strong>.
              Esta acción eliminará su registro de usuario y todos sus avisos asociados.
            </p>

            <div className="p-3 bg-arena/40 rounded-xl border border-petroleo/10 text-xs text-petroleo font-sans">
              ℹ️ <strong>Re-registro con Google:</strong> Si este usuario decide ingresar nuevamente
              con Google en el futuro, podrá hacerlo sin problemas y se generará una cuenta nueva limpia.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={deleteSaving}
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 rounded-full border border-petroleo/20 hover:bg-arena/50 text-petroleo text-xs font-display font-semibold uppercase tracking-wider transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={deleteSaving}
                onClick={handleDeleteUser}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-display font-bold uppercase tracking-wider transition shadow-xs"
                data-testid="confirm-delete-user-btn"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleteSaving ? 'Eliminando...' : 'Sí, Eliminar Usuario'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
