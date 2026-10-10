'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Loader2,
  RefreshCw,
  Building2,
  User,
  Mail,
  MessageCircle,
  Globe,
  Sparkles,
  ShieldCheck,
  ImageIcon,
  MapPin,
} from 'lucide-react';
import { formatWorkZoneDisplay } from '@/lib/tags';

export interface PendingListing {
  id: string;
  title: string;
  description: string;
  aiCorrectedTitle?: string | null;
  aiCorrectedDesc?: string | null;
  status: string;
  whatsapp?: string | null;
  email?: string | null;
  webUrl?: string | null;
  createdAt: string;
  category?: { id: string; name: string; slug: string } | null;
  subcategory?: { id: string; name: string; slug: string } | null;
  tags?: Array<{ tag?: { id: string; name: string; slug?: string }; id?: string; name?: string; slug?: string }>;
  workZone?: string | null;
  workNeighborhood?: string | null;
  school?: {
    id: string;
    nombre: string;
    localidad?: string;
    departamento?: string;
  } | null;
  schoolRequest?: {
    id: string;
    nombre: string;
    localidad?: string;
    departamento?: string;
  } | null;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    dni?: string | null;
    schoolOfOrigin?: {
      nombre: string;
      localidad?: string;
      departamento?: string;
    } | null;
  } | null;
  images?: Array<{ id: string; url: string; orderIndex: number }>;
}

interface AdminPendingSectionProps {
  onApproved?: (listingId: string) => void;
  className?: string;
}

export default function AdminPendingSection({
  onApproved,
  className = '',
}: AdminPendingSectionProps) {
  const [pendingListings, setPendingListings] = useState<PendingListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/pending');
      if (res.ok) {
        const data = await res.json();
        setPendingListings(Array.isArray(data) ? data : []);
      } else {
        // Fallback to metrics endpoint if needed
        const metricsRes = await fetch('/api/admin/metrics');
        if (metricsRes.ok) {
          const metrics = await metricsRes.json();
          const queue = metrics.pendingListings || metrics.moderationQueue || [];
          setPendingListings(queue);
        } else {
          setError('No se pudieron obtener los avisos pendientes.');
        }
      }
    } catch (err: any) {
      console.error('Error cargando avisos pendientes:', err);
      setError('Error al consultar avisos pendientes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleModerate = async (
    id: string,
    title: string,
    newStatus: 'APPROVED' | 'REJECTED'
  ) => {
    setActionId(id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'No se pudo actualizar el estado.');
      }

      // Remover inmediatamente de la lista local
      setPendingListings((prev) => prev.filter((item) => item.id !== id));

      if (newStatus === 'APPROVED') {
        setFeedback({
          type: 'success',
          message: `¡Aviso "${title}" aprobado! Ya es visible públicamente en el catálogo.`,
        });
        // Notificar al componente padre para que refresque el catálogo público inmediatamente
        if (onApproved) {
          onApproved(id);
        }
      } else {
        setFeedback({
          type: 'success',
          message: `El aviso "${title}" ha sido rechazado.`,
        });
      }
    } catch (err: any) {
      console.error('Error moderando aviso:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Error al procesar la moderación.',
      });
    } finally {
      setActionId(null);
    }
  };

  return (
    <section
      id="avisos-pendientes"
      aria-label="Avisos pendientes de aprobación"
      className={`bg-white rounded-3xl border-2 border-mostaza/40 shadow-sm overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="px-6 py-5 bg-gradient-to-r from-arena/40 via-arena/20 to-menta/20 border-b border-petroleo/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-mostaza/20 text-mostaza shrink-0">
            <Clock className="w-5 h-5 text-mostaza" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-lg sm:text-xl font-bold text-petroleo">
                Avisos pendientes de aprobación
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold font-display uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-mostaza text-white">
                <ShieldCheck className="w-3 h-3" />
                <span>Admin</span>
              </span>
            </div>
            <p className="text-xs text-secondary font-sans mt-0.5">
              Revisá las publicaciones enviadas por las familias. Al aprobar, el aviso pasará a ser visible en el catálogo de forma inmediata.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-display font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-petroleo text-white shadow-2xs">
            {pendingListings.length} pendiente{pendingListings.length === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            onClick={fetchPending}
            disabled={loading}
            title="Actualizar cola de pendientes"
            className="p-2 rounded-xl border border-petroleo/15 text-petroleo hover:bg-arena/50 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {feedback && (
        <div
          className={`mx-6 mt-4 p-3.5 rounded-2xl text-xs sm:text-sm font-medium flex items-center justify-between gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold hover:underline shrink-0"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Body Content */}
      <div className="p-6">
        {loading && pendingListings.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-secondary">
            <Loader2 className="w-7 h-7 text-mostaza animate-spin mb-2" />
            <p className="text-xs font-medium">Cargando avisos pendientes...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : pendingListings.length === 0 ? (
          <div className="py-10 text-center bg-arena/10 rounded-2xl border border-dashed border-petroleo/15 p-6">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-petroleo text-base">
              ¡No hay avisos pendientes de moderación!
            </h3>
            <p className="text-xs text-secondary mt-1 max-w-md mx-auto">
              Todas las publicaciones han sido aprobadas o revisadas. Cuando un usuario publique un nuevo servicio, aparecerá aquí para tu aprobación.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingListings.map((item) => {
              const displayTitle = item.aiCorrectedTitle || item.title;
              const hasAiCorrection =
                Boolean(item.aiCorrectedTitle && item.aiCorrectedTitle !== item.title) ||
                Boolean(item.aiCorrectedDesc && item.aiCorrectedDesc !== item.description);
              const schoolName =
                item.school?.nombre || item.schoolRequest?.nombre || 'Colegio no especificado';
              const userName = item.user?.name || 'Usuario Criana';
              const userEmail = item.user?.email || null;
              const userDni = item.user?.dni || null;
              const userOrigin = item.user?.schoolOfOrigin?.nombre || null;
              const isWorking = actionId === item.id;

              return (
                <article
                  key={item.id}
                  className="bg-ivory/40 hover:bg-ivory border border-petroleo/15 hover:border-petroleo/30 rounded-2xl p-5 sm:p-6 transition shadow-2xs space-y-4"
                >
                  {/* Top row: tags, dates & link */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-petroleo/10 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.tags && item.tags.length > 0 ? (
                        item.tags.map((lt: any, idx: number) => (
                          <span
                            key={lt.tag?.id || lt.id || idx}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-display font-bold bg-arena text-petroleo"
                          >
                            #{lt.tag?.name || lt.name}
                          </span>
                        ))
                      ) : (
                        <>
                          {item.category?.name && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-display font-semibold bg-arena text-petroleo">
                              {item.category.name}
                            </span>
                          )}
                          {item.subcategory?.name && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-sans text-secondary bg-white border border-petroleo/10">
                              {item.subcategory.name}
                            </span>
                          )}
                        </>
                      )}

                      {item.workZone && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-display font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                          <MapPin className="w-3 h-3 text-coral" />
                          <span>{formatWorkZoneDisplay(item.workZone, item.workNeighborhood)}</span>
                        </span>
                      )}

                      {hasAiCorrection && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-sans font-medium text-emerald-800 bg-emerald-50 border border-emerald-200">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          <span>Ortografía optimizada con IA</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-secondary">
                      <span>
                        Enviado el:{' '}
                        <strong className="text-petroleo">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-AR') : 'Reciente'}
                        </strong>
                      </span>
                      <Link
                        href={`/servicios/${item.id}`}
                        className="inline-flex items-center gap-1 font-semibold text-petroleo hover:text-coral transition"
                        title="Abrir ficha completa"
                      >
                        <span>Ver ficha completa</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {/* Title and description */}
                  <div className="space-y-1.5">
                    <h3 className="font-serif font-bold text-lg sm:text-xl text-petroleo leading-snug">
                      {displayTitle}
                    </h3>
                    <p className="text-xs sm:text-sm text-secondary font-sans leading-relaxed line-clamp-3">
                      {item.aiCorrectedDesc || item.description}
                    </p>
                  </div>

                  {/* Thumbnail gallery if images present */}
                  {item.images && item.images.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                      {item.images.map((img, idx) => (
                        <div
                          key={img.id || idx}
                          className="w-16 h-16 rounded-xl border border-petroleo/15 overflow-hidden shrink-0 bg-slate-100"
                        >
                          <img
                            src={img.url}
                            alt={`Imagen ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      <span className="text-[11px] text-secondary font-sans pl-1">
                        ({item.images.length} imagen{item.images.length === 1 ? '' : 'es'} adjunta{item.images.length === 1 ? '' : 's'})
                      </span>
                    </div>
                  )}

                  {/* Context and Advertiser metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white/80 p-3.5 rounded-xl border border-petroleo/10">
                    {/* Colegio relacionado */}
                    <div className="flex items-start gap-2">
                      <Building2 className="w-4 h-4 text-petroleo shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-petroleo block">Colegio relacionado:</span>
                        <span className="text-secondary">{schoolName}</span>
                      </div>
                    </div>

                    {/* Datos del Anunciante */}
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-petroleo shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-petroleo block">
                          Recomendado por / Anunciante:
                        </span>
                        <span className="text-secondary">
                          {userName}
                          {userDni ? ` (DNI: ${userDni})` : ''}
                        </span>
                        {userEmail && (
                          <span className="text-slate-400 block text-[11px]">{userEmail}</span>
                        )}
                        {userOrigin && (
                          <span className="text-[11px] text-emerald-800 block">
                            Colegio de origen: {userOrigin}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Channels preview */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-secondary pt-1">
                    {item.whatsapp && (
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{item.whatsapp}</span>
                      </span>
                    )}
                    {item.email && (
                      <span className="inline-flex items-center gap-1.5 text-blue-700 font-medium">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{item.email}</span>
                      </span>
                    )}
                    {item.webUrl && (
                      <span className="inline-flex items-center gap-1.5 text-purple-700 font-medium truncate max-w-xs">
                        <Globe className="w-3.5 h-3.5" />
                        <span className="truncate">{item.webUrl}</span>
                      </span>
                    )}
                  </div>

                  {/* Bottom: Action Buttons */}
                  <div className="pt-3 border-t border-petroleo/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
                    <button
                      type="button"
                      disabled={isWorking}
                      onClick={() => handleModerate(item.id, displayTitle, 'REJECTED')}
                      className="px-4 py-2 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-display font-semibold uppercase tracking-wider transition inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isWorking ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      )}
                      <span>Rechazar</span>
                    </button>

                    <button
                      type="button"
                      disabled={isWorking}
                      onClick={() => handleModerate(item.id, displayTitle, 'APPROVED')}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-display font-bold uppercase tracking-wider shadow-xs transition inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isWorking ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>Aprobar Aviso (Hacer Visible Inmediatamente)</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
