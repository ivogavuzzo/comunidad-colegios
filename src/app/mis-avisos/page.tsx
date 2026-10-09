'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  PlusCircle,
  Clock,
  CheckCircle2,
  EyeOff,
  XCircle,
  ExternalLink,
  Edit3,
  Trash2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Building2,
  MessageCircle,
  Mail,
  Globe,
  Sparkles,
  Lock,
  ArrowRight,
  PackageOpen,
  MousePointerClick,
} from 'lucide-react';

interface UserListing {
  id: string;
  title: string;
  description: string;
  aiCorrectedTitle?: string | null;
  aiCorrectedDesc?: string | null;
  status: 'PENDING' | 'APPROVED' | 'HIDDEN' | 'REJECTED';
  whatsapp?: string | null;
  email?: string | null;
  webUrl?: string | null;
  createdAt: string;
  category?: { id: string; name: string } | null;
  subcategory?: { id: string; name: string } | null;
  school?: { id: string; nombre: string; localidad: string } | null;
  schoolRequest?: { id: string; nombre: string; localidad: string } | null;
  images?: Array<{ id: string; url: string }>;
  _count?: {
    clicks: number;
  };
}

export default function MisAvisosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [listings, setListings] = useState<UserListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Edit modal states
  const [editingListing, setEditingListing] = useState<UserListing | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editWebUrl, setEditWebUrl] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Delete modal state
  const [deletingListing, setDeletingListing] = useState<UserListing | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMyListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/user/listings');
      if (res.ok) {
        const data = await res.json();
        setListings(Array.isArray(data) ? data : []);
      } else if (res.status === 401) {
        // Not logged in
        setListings([]);
      } else {
        setError('No se pudieron cargar tus avisos.');
      }
    } catch (err) {
      console.error('Error cargando avisos del usuario:', err);
      setError('Error al consultar tus avisos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchMyListings();
    } else if (status !== 'loading') {
      setLoading(false);
    }
  }, [session, status, fetchMyListings]);

  // Status Switch (Publicado / No publicado)
  const handleTogglePublished = async (listing: UserListing) => {
    if (listing.status !== 'APPROVED' && listing.status !== 'HIDDEN') return;
    const nextStatus = listing.status === 'APPROVED' ? 'HIDDEN' : 'APPROVED';

    setActionLoadingId(listing.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/listings/${listing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'No se pudo cambiar la visibilidad.');
      }

      setListings((prev) =>
        prev.map((item) =>
          item.id === listing.id ? { ...item, status: nextStatus } : item
        )
      );

      setFeedback({
        type: 'success',
        message:
          nextStatus === 'APPROVED'
            ? `¡Aviso "${listing.title}" publicado! Ahora es visible en el catálogo.`
            : `Aviso "${listing.title}" pausado (no publicado). Podés volver a activarlo en cualquier momento.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error al cambiar la publicación.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open edit modal
  const openEdit = (listing: UserListing) => {
    setEditingListing(listing);
    setEditTitle(listing.title);
    setEditDesc(listing.description);
    setEditWhatsapp(listing.whatsapp || '');
    setEditEmail(listing.email || '');
    setEditWebUrl(listing.webUrl || '');
  };

  // Submit edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListing) return;
    setEditSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/listings/${editingListing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDesc.trim(),
          whatsapp: editWhatsapp.trim() || undefined,
          email: editEmail.trim() || undefined,
          webUrl: editWebUrl.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Error al guardar modificaciones.');
      }

      const updated = await res.json();

      setListings((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
      );

      setEditingListing(null);
      setFeedback({
        type: 'success',
        message:
          '¡Modificaciones guardadas! Como editaste el contenido, el aviso pasará nuevamente por revisión y aprobación de un administrador antes de mostrarse en el catálogo.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error al modificar el aviso.',
      });
    } finally {
      setEditSaving(false);
    }
  };

  // Delete listing
  const handleConfirmDelete = async () => {
    if (!deletingListing) return;
    setIsDeleting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/listings/${deletingListing.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Error al eliminar el aviso.');
      }

      setListings((prev) => prev.filter((item) => item.id !== deletingListing.id));
      setFeedback({
        type: 'success',
        message: `El aviso "${deletingListing.title}" ha sido eliminado permanentemente.`,
      });
      setDeletingListing(null);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error al eliminar el aviso.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-8 h-8 text-coral animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium text-secondary">Verificando sesión...</p>
      </div>
    );
  }

  // Not logged in prompt
  if (!session || !session.user) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white border border-slate-200/80 rounded-3xl shadow-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-arena/40 text-petroleo flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-petroleo">
          Ingresá a tu Cuenta
        </h1>
        <p className="text-sm text-secondary mt-2 mb-6 leading-relaxed">
          Para ver, pausar, editar o eliminar los avisos que subiste a la comunidad, iniciá sesión con Google.
        </p>
        <button
          onClick={() => signIn('google')}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-petroleo hover:bg-petroleo/90 text-white font-semibold text-sm rounded-xl transition shadow-xs"
        >
          <span>Continuar con Google</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-petroleo/10 pb-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-petroleo">
            Mis Avisos Publicados
          </h1>
          <p className="text-xs sm:text-sm text-secondary font-sans mt-1">
            Administrá tus publicaciones en la comunidad escolar. Podés pausar y reactivar su visibilidad, modificarlas o darlas de baja.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchMyListings}
            disabled={loading}
            className="p-2.5 rounded-xl border border-petroleo/15 text-petroleo hover:bg-arena/50 transition disabled:opacity-50"
            title="Refrescar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/publicar"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-petroleo hover:bg-petroleo/90 text-white text-xs font-display font-bold uppercase tracking-wider shadow-xs transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Publicar Nuevo Aviso</span>
          </Link>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm font-medium flex items-center justify-between gap-3 border shadow-xs ${
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
            className="text-xs font-bold hover:underline shrink-0"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Listings List */}
      {loading && listings.length === 0 ? (
        <div className="py-20 text-center text-secondary">
          <Loader2 className="w-8 h-8 text-coral animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium">Cargando tus publicaciones...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : listings.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-petroleo/10 shadow-criana p-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-arena/50 flex items-center justify-center text-secondary mx-auto">
            <PackageOpen className="w-8 h-8 text-petroleo" />
          </div>
          <h2 className="font-serif text-xl font-bold text-petroleo">
            Todavía no publicaste ningún aviso
          </h2>
          <p className="text-xs sm:text-sm text-secondary font-sans max-w-md mx-auto leading-relaxed">
            Ofrecé tus servicios, clases, traslados o actividades a las familias de tu colegio o colegios vecinos de la comunidad.
          </p>
          <div className="pt-2">
            <Link
              href="/publicar"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-petroleo hover:bg-petroleo/90 text-white text-xs font-display font-bold uppercase tracking-wider shadow-sm transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Publicar mi primer aviso</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map((item) => {
            const isApproved = item.status === 'APPROVED';
            const isHidden = item.status === 'HIDDEN';
            const isPending = item.status === 'PENDING';
            const isRejected = item.status === 'REJECTED';
            const displayTitle = item.aiCorrectedTitle || item.title;
            const schoolName =
              item.school?.nombre || item.schoolRequest?.nombre || 'Colegio relacionado';
            const clicksCount = item._count?.clicks || 0;
            const isToggling = actionLoadingId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-petroleo/15 hover:border-petroleo/30 p-5 sm:p-6 shadow-2xs transition space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-petroleo/10 pb-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Badge */}
                    {isApproved && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Publicado y Visible</span>
                      </span>
                    )}
                    {isHidden && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                        <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                        <span>No Publicado (Pausado)</span>
                      </span>
                    )}
                    {isPending && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Pendiente de Aprobación</span>
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Rechazado por moderación</span>
                      </span>
                    )}

                    {item.category && (
                      <span className="text-xs font-display font-semibold uppercase tracking-wider text-secondary bg-arena/40 px-2.5 py-0.5 rounded-md">
                        {item.category.name}
                      </span>
                    )}
                  </div>

                  {/* Switch Publicado / No Publicado */}
                  <div className="flex items-center gap-3">
                    {(isApproved || isHidden) && (
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                        <span className="text-xs font-display font-bold uppercase tracking-wider text-slate-600">
                          {isApproved ? 'Publicado' : 'Pausado'}
                        </span>
                        <label className="inline-flex items-center cursor-pointer select-none relative">
                          <input
                            type="checkbox"
                            checked={isApproved}
                            disabled={isToggling}
                            onChange={() => handleTogglePublished(item)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 relative transition-colors"></div>
                        </label>
                      </div>
                    )}

                    <Link
                      href={`/servicios/${item.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-petroleo hover:text-coral transition"
                      title="Ver ficha pública"
                    >
                      <span>Ver ficha</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Content info */}
                <div className="space-y-1.5">
                  <h3 className="font-serif font-bold text-lg text-petroleo leading-snug">
                    {displayTitle}
                  </h3>
                  <p className="text-xs sm:text-sm text-secondary font-sans leading-relaxed line-clamp-2">
                    {item.aiCorrectedDesc || item.description}
                  </p>
                </div>

                {/* Details row: School and Contact channels */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-secondary pt-1">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                      <Building2 className="w-3.5 h-3.5 text-petroleo" />
                      <span>{schoolName}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <MousePointerClick className="w-3.5 h-3.5 text-mostaza" />
                      <span>{clicksCount} contactos recibidos</span>
                    </span>

                    <span className="text-slate-400">
                      Creado:{' '}
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString('es-AR')
                        : 'Reciente'}
                    </span>
                  </div>

                  {/* Actions: Modificar & Borrar */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-petroleo/30 text-xs font-display font-semibold uppercase tracking-wider text-petroleo hover:bg-slate-50 transition"
                      title="Modificar los datos del aviso"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Modificar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingListing(item)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-display font-semibold uppercase tracking-wider transition"
                      title="Eliminar este aviso de forma permanente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Borrar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Modificación con Advertencia de Re-Aprobación */}
      {editingListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-petroleo text-white">
                  <Edit3 className="w-5 h-5" />
                </div>
                <h3 className="font-serif font-bold text-lg sm:text-xl text-petroleo">
                  Modificar Aviso
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingListing(null)}
                className="text-slate-400 hover:text-slate-700 transition"
              >
                ✕
              </button>
            </div>

            {/* Aviso Obligatorio de Re-Moderación */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs sm:text-sm space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Atención: Requiere nueva aprobación por un administrador</span>
              </div>
              <p className="leading-relaxed text-amber-900/90 text-xs">
                Para mantener la seguridad y calidad comunitaria del catálogo, si modificás el contenido de tu aviso, este pasará automáticamente al estado <strong className="text-amber-950">PENDIENTE</strong> y deberá ser revisado nuevamente por un administrador antes de mostrarse en el catálogo público.
              </p>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-petroleo uppercase tracking-wider mb-1">
                  Título del Servicio *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-petroleo focus:ring-2 focus:ring-petroleo/20 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-petroleo uppercase tracking-wider mb-1">
                  Descripción Detallada *
                </label>
                <textarea
                  rows={4}
                  required
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-petroleo focus:ring-2 focus:ring-petroleo/20 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-petroleo uppercase tracking-wider mb-1">
                    WhatsApp
                  </label>
                  <input
                    type="text"
                    value={editWhatsapp}
                    onChange={(e) => setEditWhatsapp(e.target.value)}
                    placeholder="+54 9 11..."
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-petroleo"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-petroleo uppercase tracking-wider mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="contacto@ejemplo.com"
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-petroleo"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-petroleo uppercase tracking-wider mb-1">
                    Web / Red Social
                  </label>
                  <input
                    type="text"
                    value={editWebUrl}
                    onChange={(e) => setEditWebUrl(e.target.value)}
                    placeholder="instagram.com/miperfil"
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-petroleo"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={editSaving}
                  onClick={() => setEditingListing(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold uppercase tracking-wider transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-5 py-2.5 rounded-xl bg-petroleo hover:bg-petroleo/90 text-white text-xs font-bold uppercase tracking-wider transition shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {editSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Guardar y Enviar a Revisión</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {deletingListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-slate-900">
                  ¿Eliminar este aviso?
                </h3>
                <p className="text-xs text-slate-500 font-sans">
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              ¿Estás seguro de que deseás eliminar <strong className="text-slate-900">&ldquo;{deletingListing.title}&rdquo;</strong>? La publicación dejará de existir en la comunidad escolar.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingListing(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold uppercase tracking-wider transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider transition shadow-sm inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Sí, borrar aviso</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
