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
} from 'lucide-react';

interface PendingListingItem {
  id: string;
  title: string;
  category: string;
  school: string;
  date: string;
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
  pendingListings?: PendingListingItem[];
  moderationQueue?: PendingListingItem[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const pendingItems = data?.pendingListings || data?.moderationQueue || [];

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
                  Panel de Estadísticas <span className="italic font-normal text-coral-light">y Métricas</span>
                </h1>
                <p className="font-display text-[11px] uppercase tracking-[0.15em] text-white/70">
                  Comunidades de Colegios (by Criana)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
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
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading && !data ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-rose-500 border-t-transparent mb-3"></div>
              <p className="text-sm text-slate-500">Cargando métricas de la plataforma...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm mb-6 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : data ? (
            <div className="space-y-8">
              {/* 1. Overview KPI Cards */}
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">
                  Resumen General de KPIs
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-500">Total Avisos</span>
                      <span className="p-2 bg-slate-100 rounded-lg text-slate-600">
                        <BarChart3 className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900" data-testid="kpi-total-listings">
                      {data.summary.totalListings}
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-500">Aprobados / Activos</span>
                      <span className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-600" data-testid="kpi-approved-listings">
                      {data.summary.approvedListings}
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-500">Pendientes</span>
                      <span className="p-2 bg-amber-100 rounded-lg text-amber-600">
                        <Clock className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-amber-600" data-testid="kpi-pending-listings">
                      {data.summary.pendingListings}
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-500">Rechazados</span>
                      <span className="p-2 bg-rose-100 rounded-lg text-rose-600">
                        <XCircle className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-rose-600" data-testid="kpi-rejected-listings">
                      {data.summary.rejectedListings}
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-500">Total Clics</span>
                      <span className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        <MousePointerClick className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-blue-700" data-testid="kpi-total-clicks">
                      {data.summary.totalClicks}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Clicks Breakdown by Channel */}
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">
                  Desglose de Clics de Contacto por Canal
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-500">WhatsApp</span>
                      <span className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                        <MessageCircle className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-700" data-testid="channel-clicks-whatsapp">
                      {data.clicksByChannel.whatsapp}
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-500">Correo Electrónico</span>
                      <span className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                        <Mail className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-indigo-700" data-testid="channel-clicks-email">
                      {data.clicksByChannel.email}
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-500">Web / Instagram</span>
                      <span className="p-2 bg-purple-100 rounded-lg text-purple-600">
                        <Globe className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-purple-700" data-testid="channel-clicks-web">
                      {data.clicksByChannel.web}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Monthly Historical Time-Series Breakdown Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Distribución de Clics por Mes
                  </h3>
                  <span className="text-xs text-slate-500">Histórico acumulado</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600" data-testid="monthly-clicks-table">
                    <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                      <tr>
                        <th className="px-6 py-3">Mes (Año-Mes)</th>
                        <th className="px-6 py-3">Total Clics</th>
                        <th className="px-6 py-3">WhatsApp</th>
                        <th className="px-6 py-3">Email</th>
                        <th className="px-6 py-3">Web / IG</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.clicksByMonth.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                            Aún no se registran eventos de clics de contacto.
                          </td>
                        </tr>
                      ) : (
                        data.clicksByMonth.map((item) => (
                          <tr key={item.month} className="hover:bg-slate-50/70 transition">
                            <td className="px-6 py-4 font-semibold text-slate-800">
                              {item.month}
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-900">
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

              {/* 4. Moderation Section: Pending Listings */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" data-testid="moderation-section">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <h3 className="font-bold text-slate-900 text-sm">
                      Cola de Moderación (Avisos Pendientes)
                    </h3>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    {pendingItems.length} pendiente{pendingItems.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600" data-testid="pending-listings-table">
                    <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                      <tr>
                        <th className="px-6 py-3">Título</th>
                        <th className="px-6 py-3">Categoría</th>
                        <th className="px-6 py-3">Colegio</th>
                        <th className="px-6 py-3">Fecha</th>
                        <th className="px-6 py-3 text-right">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                            No hay publicaciones pendientes de moderación en este momento.
                          </td>
                        </tr>
                      ) : (
                        pendingItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/70 transition">
                            <td className="px-6 py-4 font-semibold text-slate-900">
                              {item.title}
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                                {item.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-700">
                              {item.school}
                            </td>
                            <td className="px-6 py-4 text-slate-500 text-xs">
                              {item.date}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                <Clock className="w-3 h-3" />
                                Pendiente
                              </span>
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
