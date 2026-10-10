'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  XCircle,
  MousePointerClick,
  MessageCircle,
  Mail,
  Globe,
  ArrowLeft,
  RefreshCw,
  ShieldAlert,
  EyeOff,
  Edit3,
  ExternalLink,
  Save,
  X,
  Tag,
} from 'lucide-react';

interface ListingItem {
  id: string;
  title: string;
  category: string;
  school: string;
  date: string;
  status?: string;
}

interface MetricsData {
  summary: {
    totalListings: number;
    approvedListings: number;
    pendingListings: number;
    rejectedListings: number;
    totalClicks: number;
  };
  clicksByChannel: {
    whatsapp: number;
    email: number;
    web: number;
  };
  clicksByMonth: Array<{
    month: string;
    clicks: number;
    whatsapp: number;
    email: number;
    web: number;
  }>;
  pendingListings?: ListingItem[];
  moderationQueue?: ListingItem[];
  allListings?: ListingItem[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Quick edit modal state
  const [editingListing, setEditingListing] = useState<ListingItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/metrics');
      if (!res.ok) {
        throw new Error(`Error ${res.status}: No se pudieron cargar las métricas`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al consultar métricas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setActionLoading(id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        if (newStatus === 'APPROVED') {
          setFeedback({
            type: 'success',
            message: '¡Aviso aprobado exitosamente! Ya es visible inmediatamente en el catálogo público.',
          });
        } else if (newStatus === 'REJECTED') {
          setFeedback({
            type: 'success',
            message: 'Aviso rechazado.',
          });
        } else if (newStatus === 'HIDDEN') {
          setFeedback({
            type: 'success',
            message: 'Aviso desactivado (oculto del catálogo público).',
          });
        }
        await fetchMetrics();
      } else {
        const errJson = await res.json().catch(() => ({}));
        setFeedback({
          type: 'error',
          message: errJson.error || 'Error al actualizar el estado del aviso.',
        });
      }
    } catch (err) {
      console.error('Error actualizando aviso:', err);
      setFeedback({
        type: 'error',
        message: 'Error de red al actualizar el aviso.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListing) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/listings/${editingListing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle }),
      });
      if (res.ok) {
        setEditingListing(null);
        await fetchMetrics();
      }
    } catch (err) {
      console.error('Error modificando aviso:', err);
    } finally {
      setEditSaving(false);
    }
  };

  const pendingItems = data?.pendingListings || data?.moderationQueue || [];
  const allListings = data?.allListings || [];

  return (
    <div className="min-h-screen bg-transparent flex flex-col justify-between">
      <div>
        {/* Top Header */}
        <header className="bg-petroleo text-white shadow-sm border-b border-petroleo-light">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-arena/20 border border-white/20 rounded-2xl text-mostaza-light">
                <BarChart3 className="w-5 h-5 text-mostaza" />
              </div>
              <div>
                <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Panel de Estadísticas <span className="italic font-normal text-coral-light">y Gestión</span>
                </h1>
                <p className="font-display text-[11px] uppercase tracking-[0.15em] text-white/70">
                  Comunidad de Colegios (by Criana)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/admin/tags"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-coral hover:bg-coral-dark text-white text-xs font-display font-semibold uppercase tracking-wider transition shadow-xs"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Gestor de Tags</span>
              </Link>
              <button
                onClick={fetchMetrics}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-display font-semibold uppercase tracking-wider transition border border-white/15"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Actualizar</span>
              </button>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 hover:bg-coral text-white text-xs font-display font-semibold uppercase tracking-wider transition border border-white/15"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver al Catálogo</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
          {loading && !data ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-coral border-t-transparent mb-3"></div>
              <p className="text-sm text-secondary">Cargando métricas y cola de avisos...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm mb-6 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : data ? (
            <div className="space-y-10">
              {/* Feedback Alert */}
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
                      <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <span>{feedback.message}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {feedback.type === 'success' && feedback.message.includes('aprobado') && (
                      <Link
                        href="/"
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1"
                      >
                        <span>Ver en el Catálogo</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => setFeedback(null)}
                      className="text-xs text-secondary hover:text-black font-semibold"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* 1. SECCIÓN OBLIGATORIA PRIORITARIA: AVISOS NUEVOS PENDIENTES   */}
              {/* ============================================================== */}
              <section
                className="bg-white rounded-3xl border-2 border-mostaza/30 shadow-md overflow-hidden"
                data-testid="moderation-section"
              >
                <div className="px-6 py-5 border-b border-petroleo/10 bg-arena/40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-mostaza/20 text-mostaza">
                      <Clock className="w-5 h-5 text-mostaza" />
                    </div>
                    <div>
                      <h2 className="font-serif text-lg sm:text-xl font-bold text-petroleo">
                        Avisos nuevos pendientes de aprobación
                      </h2>
                      <p className="text-xs text-secondary font-sans">
                        Revisá las publicaciones enviadas por las familias antes de hacerlas visibles en el catálogo.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-display font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-mostaza text-white">
                    {pendingItems.length} pendiente{pendingItems.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-petroleo" data-testid="pending-listings-table">
                    <thead className="bg-arena/20 text-xs font-display uppercase tracking-wider text-secondary">
                      <tr>
                        <th className="px-6 py-3.5">Título</th>
                        <th className="px-6 py-3.5">Categoría</th>
                        <th className="px-6 py-3.5">Colegio</th>
                        <th className="px-6 py-3.5">Fecha</th>
                        <th className="px-6 py-3.5 text-right">Acciones Rápidas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-petroleo/5">
                      {pendingItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center text-secondary font-sans text-sm">
                            🎉 No hay publicaciones pendientes de moderación en este momento. ¡Todo al día!
                          </td>
                        </tr>
                      ) : (
                        pendingItems.map((item) => (
                          <tr key={item.id} className="hover:bg-arena/30 transition">
                            <td className="px-6 py-4">
                              <Link
                                href={`/servicios/${item.id}`}
                                className="font-serif font-bold text-petroleo hover:text-coral transition-colors flex items-center gap-1.5"
                              >
                                <span>{item.title}</span>
                                <ExternalLink className="w-3.5 h-3.5 text-secondary" />
                              </Link>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-display font-semibold bg-arena text-petroleo">
                                {item.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-secondary text-xs">
                              {item.school}
                            </td>
                            <td className="px-6 py-4 text-secondary text-xs">
                              {item.date}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={actionLoading === item.id}
                                  onClick={() => handleUpdateStatus(item.id, 'APPROVED')}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-display font-bold uppercase tracking-wider shadow-xs transition"
                                  title="Aprobar y activar en el catálogo público"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Aprobar</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={actionLoading === item.id}
                                  onClick={() => handleUpdateStatus(item.id, 'REJECTED')}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white text-rose-600 border border-rose-300 hover:bg-rose-50 text-xs font-display font-semibold uppercase tracking-wider transition"
                                  title="Rechazar aviso"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Rechazar</span>
                                </button>
                                <Link
                                  href={`/servicios/${item.id}`}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-arena hover:bg-arena/70 text-petroleo text-xs font-display font-semibold uppercase tracking-wider transition"
                                  title="Ingresar para revisar o modificar"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-secondary" />
                                  <span>Modificar</span>
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* ============================================================== */}
              {/* 2. GESTIÓN INTEGRAL DE AVISOS (ACTIVAR / DESACTIVAR / MODIFICAR) */}
              {/* ============================================================== */}
              <section className="bg-white rounded-3xl border border-petroleo/10 shadow-criana overflow-hidden">
                <div className="px-6 py-5 border-b border-petroleo/10 bg-ivory/60 flex items-center justify-between">
                  <div>
                    <h2 className="font-serif text-lg font-bold text-petroleo">
                      Gestión Integral de Publicaciones
                    </h2>
                    <p className="text-xs text-secondary font-sans">
                      Activá, desactivá (hacé invisible) o modificá cualquier aviso del sistema en tiempo real.
                    </p>
                  </div>
                  <span className="text-xs font-display font-semibold uppercase tracking-wider text-secondary">
                    Total: {allListings.length} avisos
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-petroleo">
                    <thead className="bg-arena/20 text-xs font-display uppercase tracking-wider text-secondary">
                      <tr>
                        <th className="px-6 py-3.5">Aviso</th>
                        <th className="px-6 py-3.5">Rubro / Colegio</th>
                        <th className="px-6 py-3.5">Estado Actual</th>
                        <th className="px-6 py-3.5 text-right">Visibilidad y Control</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-petroleo/5">
                      {allListings.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-secondary text-sm">
                            No hay avisos registrados todavía.
                          </td>
                        </tr>
                      ) : (
                        allListings.map((listing) => {
                          const isApproved = listing.status === 'APPROVED';
                          const isHidden = listing.status === 'HIDDEN';
                          const isPending = listing.status === 'PENDING';
                          const isRejected = listing.status === 'REJECTED';

                          return (
                            <tr key={listing.id} className="hover:bg-arena/20 transition">
                              <td className="px-6 py-4">
                                <Link
                                  href={`/servicios/${listing.id}`}
                                  className="font-serif font-bold text-petroleo hover:text-coral transition-colors flex items-center gap-1.5"
                                >
                                  <span>{listing.title}</span>
                                  <ExternalLink className="w-3 h-3 text-secondary" />
                                </Link>
                                <span className="text-[11px] text-secondary font-sans block">
                                  ID: {listing.id.substring(0, 14)}...
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-display font-semibold text-xs text-petroleo block">
                                  {listing.category}
                                </span>
                                <span className="text-xs text-secondary truncate max-w-xs block">
                                  {listing.school}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {isApproved && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-display font-bold bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Activo / Visible
                                  </span>
                                )}
                                {isHidden && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-display font-semibold bg-slate-100 text-slate-700">
                                    <EyeOff className="w-3 h-3" />
                                    Invisible (Oculto)
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
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="inline-flex items-center gap-2">
                                  {isApproved ? (
                                    <button
                                      type="button"
                                      disabled={actionLoading === listing.id}
                                      onClick={() => handleUpdateStatus(listing.id, 'HIDDEN')}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-display font-semibold uppercase tracking-wider transition"
                                      title="Desactivar y hacer invisible"
                                    >
                                      <EyeOff className="w-3.5 h-3.5" />
                                      <span>Desactivar</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={actionLoading === listing.id}
                                      onClick={() => handleUpdateStatus(listing.id, 'APPROVED')}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-display font-bold uppercase tracking-wider transition shadow-xs"
                                      title="Activar y hacer visible"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Activar</span>
                                    </button>
                                  )}

                                  <Link
                                    href={`/servicios/${listing.id}`}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-coral hover:bg-coral-dark text-white text-xs font-display font-bold uppercase tracking-wider transition shadow-xs"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Modificar</span>
                                  </Link>
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

              {/* ============================================================== */}
              {/* 3. RESUMEN GENERAL DE KPIS                                     */}
              {/* ============================================================== */}
              <div>
                <h2 className="text-xs font-display font-bold uppercase tracking-[0.15em] text-secondary mb-4">
                  Resumen General de KPIs
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-petroleo/10 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-display uppercase tracking-wider text-secondary">Total Avisos</span>
                      <span className="p-2 bg-arena/50 rounded-xl text-petroleo">
                        <BarChart3 className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="text-2xl font-serif font-bold text-petroleo" data-testid="kpi-total-listings">
                      {data.summary.totalListings}
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-petroleo/10 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-display uppercase tracking-wider text-secondary">Aprobados / Activos</span>
                      <span className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="text-2xl font-serif font-bold text-emerald-600" data-testid="kpi-approved-listings">
                      {data.summary.approvedListings}
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-petroleo/10 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-display uppercase tracking-wider text-secondary">Pendientes</span>
                      <span className="p-2 bg-amber-100 rounded-xl text-amber-600">
                        <Clock className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="text-2xl font-serif font-bold text-amber-600" data-testid="kpi-pending-listings">
                      {data.summary.pendingListings}
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-petroleo/10 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-display uppercase tracking-wider text-secondary">Rechazados</span>
                      <span className="p-2 bg-rose-100 rounded-xl text-rose-600">
                        <XCircle className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="text-2xl font-serif font-bold text-rose-600" data-testid="kpi-rejected-listings">
                      {data.summary.rejectedListings}
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-petroleo/10 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-display uppercase tracking-wider text-secondary">Total Clics</span>
                      <span className="p-2 bg-coral/10 rounded-xl text-coral">
                        <MousePointerClick className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="text-2xl font-serif font-bold text-coral" data-testid="kpi-total-clicks">
                      {data.summary.totalClicks}
                    </div>
                  </div>
                </div>
              </div>

              {/* ============================================================== */}
              {/* 4. MÉTRICAS DE CONTACTO POR CANAL Y MENSUALES                   */}
              {/* ============================================================== */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-petroleo/10 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-display uppercase tracking-wider text-secondary">WhatsApp</span>
                    <div className="text-2xl font-serif font-bold text-emerald-600 mt-1" data-testid="channel-clicks-whatsapp">
                      {data.clicksByChannel.whatsapp}
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-petroleo/10 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-display uppercase tracking-wider text-secondary">Email</span>
                    <div className="text-2xl font-serif font-bold text-indigo-600 mt-1" data-testid="channel-clicks-email">
                      {data.clicksByChannel.email}
                    </div>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                    <Mail className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-petroleo/10 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-display uppercase tracking-wider text-secondary">Web / Instagram</span>
                    <div className="text-2xl font-serif font-bold text-purple-600 mt-1" data-testid="channel-clicks-web">
                      {data.clicksByChannel.web}
                    </div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-2xl text-purple-600">
                    <Globe className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Tabla de Clics Mensuales */}
              <div className="bg-white rounded-3xl border border-petroleo/10 shadow-criana overflow-hidden">
                <div className="px-6 py-4 border-b border-petroleo/10 bg-ivory/60 flex items-center justify-between">
                  <h3 className="font-serif font-bold text-petroleo text-sm">
                    Distribución de Clics por Mes
                  </h3>
                  <span className="text-xs text-secondary font-sans">Histórico acumulado</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-petroleo" data-testid="monthly-clicks-table">
                    <thead className="bg-arena/20 text-xs font-display uppercase tracking-wider text-secondary">
                      <tr>
                        <th className="px-6 py-3">Mes (Año-Mes)</th>
                        <th className="px-6 py-3">Total Clics</th>
                        <th className="px-6 py-3">WhatsApp</th>
                        <th className="px-6 py-3">Email</th>
                        <th className="px-6 py-3">Web / IG</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-petroleo/5">
                      {data.clicksByMonth.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-secondary font-sans">
                            Aún no se registran eventos de clics de contacto.
                          </td>
                        </tr>
                      ) : (
                        data.clicksByMonth.map((item) => (
                          <tr key={item.month} className="hover:bg-arena/20 transition">
                            <td className="px-6 py-4 font-semibold text-petroleo">
                              {item.month}
                            </td>
                            <td className="px-6 py-4 font-bold text-petroleo">
                              {item.clicks}
                            </td>
                            <td className="px-6 py-4 text-emerald-600 font-medium">
                              {item.whatsapp}
                            </td>
                            <td className="px-6 py-4 text-indigo-600 font-medium">
                              {item.email}
                            </td>
                            <td className="px-6 py-4 text-purple-600 font-medium">
                              {item.web}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
