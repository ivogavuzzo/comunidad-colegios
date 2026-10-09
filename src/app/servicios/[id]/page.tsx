'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  MessageCircle,
  Mail,
  Globe,
  School as SchoolIcon,
  ShieldAlert,
  CheckCircle2,
  EyeOff,
  Edit3,
  Save,
  X,
  Clock,
  Sparkles,
  User,
  MapPin,
  Trash2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface SchoolInfo {
  id: string;
  nombre: string;
  domicilio: string;
  localidad: string;
  departamento: string;
  jurisdiccion: string;
}

interface ListingDetail {
  id: string;
  userId?: string | null;
  title: string;
  description: string;
  aiCorrectedTitle?: string | null;
  aiCorrectedDesc?: string | null;
  status: string; // "APPROVED" | "PENDING" | "HIDDEN" | "REJECTED"
  isPermanentFeatured?: boolean;
  whatsapp?: string | null;
  email?: string | null;
  webUrl?: string | null;
  category?: { id: string; name: string; slug: string } | null;
  subcategory?: { id: string; name: string; slug: string } | null;
  school?: SchoolInfo | null;
  schoolRequest?: SchoolInfo | null;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    schoolOfOrigin?: SchoolInfo | null;
  } | null;
  images?: { id: string; url: string }[];
}

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  // Edit form state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editWebUrl, setEditWebUrl] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const listingOwnerId = listing?.userId || listing?.user?.id;
  const isOwner = Boolean(
    session?.user?.id && listingOwnerId && session.user.id === listingOwnerId
  );
  const canManage = isOwner || isAdmin;

  useEffect(() => {
    if (!params?.id) return;
    const fetchListing = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/listings/${params.id}`);
        if (!res.ok) {
          throw new Error('No se encontró el servicio solicitado.');
        }
        const data = await res.json();
        setListing(data);
        setEditTitle(data.title);
        setEditDesc(data.description);
        setEditWhatsapp(data.whatsapp || '');
        setEditEmail(data.email || '');
        setEditWebUrl(data.webUrl || '');
      } catch (err: any) {
        setError(err.message || 'Error al cargar el aviso');
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [params?.id]);

  const trackClick = async (channel: 'WHATSAPP' | 'EMAIL' | 'WEB') => {
    if (!listing) return;
    try {
      fetch('/api/track/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id, channel }),
      }).catch(() => {});
    } catch {}
  };

  const handleStatusToggle = async (newStatus: string) => {
    if (!listing) return;
    setSaving(true);
    setStatusFeedback(null);
    try {
      const res = await fetch(`/api/listings/${listing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setListing((prev) => (prev ? { ...prev, status: updated.status } : null));
        if (newStatus === 'APPROVED') {
          setStatusFeedback('¡Aviso publicado y visible en el catálogo!');
        } else if (newStatus === 'HIDDEN') {
          setStatusFeedback('Aviso pausado (no publicado). Podés volver a activarlo en cualquier momento.');
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        setError(errJson.error || 'No se pudo cambiar el estado de publicación.');
      }
    } catch (err) {
      console.error('Error actualizando estado:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing) return;
    setSaving(true);
    setStatusFeedback(null);
    try {
      const res = await fetch(`/api/listings/${listing.id}`, {
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
      if (res.ok) {
        const updated = await res.json();
        setListing((prev) =>
          prev
            ? {
                ...prev,
                ...updated,
              }
            : null
        );
        setIsEditing(false);
        if (isOwner && !isAdmin) {
          setStatusFeedback(
            '¡Aviso modificado con éxito! Debido a que editaste el contenido, ha pasado a estado PENDIENTE y será revisado nuevamente por un administrador.'
          );
        } else {
          setStatusFeedback('Modificaciones guardadas correctamente.');
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        setError(errJson.error || 'No se pudieron guardar las modificaciones.');
      }
    } catch (err) {
      console.error('Error guardando modificaciones:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteListing = async () => {
    if (!listing) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/listings/${listing.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'No se pudo eliminar el aviso.');
      }
      router.push('/mis-avisos');
    } catch (err: any) {
      console.error('Error al eliminar aviso:', err);
      setError(err.message || 'Error al eliminar el aviso.');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const cleanWhatsappNumber = (phone: string) => phone.replace(/[^\d]/g, '');

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-coral border-t-transparent mb-3"></div>
        <p className="text-sm font-sans text-secondary">Cargando información del servicio...</p>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-petroleo">Aviso no encontrado</h2>
        <p className="text-secondary text-sm">El aviso solicitado no existe o fue retirado de la plataforma.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-petroleo text-white text-xs font-display font-semibold uppercase tracking-wider hover:bg-coral transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Catálogo</span>
        </Link>
      </div>
    );
  }

  const isCrianaFeatured =
    listing.isPermanentFeatured || listing.id === 'criana-official-featured';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      {/* Botón Volver */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-display font-bold uppercase tracking-wider text-secondary hover:text-petroleo transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a la Comunidad</span>
        </Link>

        {listing.school && (
          <span className="text-xs font-sans text-secondary">
            {listing.school.departamento}, {listing.school.jurisdiccion}
          </span>
        )}
      </div>

      {/* Barra de Gestión para el Anunciante y Administrador */}
      {canManage && (
        <section
          data-testid="admin-listing-control-bar"
          className="bg-petroleo text-white rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 border border-petroleo-light"
        >
          {/* Status Feedback banner */}
          {statusFeedback && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs sm:text-sm flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{statusFeedback}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatusFeedback(null)}
                className="text-xs font-bold hover:underline"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-display uppercase tracking-widest font-bold text-mostaza-light">
                {isOwner ? 'Tu Publicación:' : 'Herramientas Admin:'}
              </span>

              {/* Status Switch (Publicado / No publicado) o Badge */}
              {listing.status === 'APPROVED' || listing.status === 'HIDDEN' ? (
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/15">
                  <span className="text-xs font-display font-bold uppercase tracking-wider text-white">
                    {listing.status === 'APPROVED' ? 'Publicado' : 'No publicado (Pausado)'}
                  </span>
                  <label className="inline-flex items-center cursor-pointer select-none relative">
                    <input
                      type="checkbox"
                      checked={listing.status === 'APPROVED'}
                      disabled={saving}
                      onChange={() => {
                        handleStatusToggle(listing.status === 'APPROVED' ? 'HIDDEN' : 'APPROVED');
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-400/70 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 relative transition-colors"></div>
                  </label>
                </div>
              ) : listing.status === 'PENDING' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pendiente de Aprobación</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-400/30">
                  <X className="w-3.5 h-3.5" />
                  <span>Rechazado</span>
                </span>
              )}
            </div>

            {/* Acciones de Edición, Borrado y Moderación Admin */}
            <div className="flex items-center gap-2">
              {isAdmin && !isOwner && listing.status === 'PENDING' && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleStatusToggle('APPROVED')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-xs font-display font-semibold uppercase tracking-wider text-white transition shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Aprobar Aviso</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-coral hover:bg-coral-dark text-xs font-display font-semibold uppercase tracking-wider text-white transition shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Cancelar Edición' : 'Modificar Aviso'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-rose-600 text-xs font-display font-semibold uppercase tracking-wider text-slate-200 hover:text-white transition"
                title="Eliminar este aviso de forma definitiva"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Borrar</span>
              </button>
            </div>
          </div>

          {/* Formulario de Modificación / Edición en Línea */}
          {isEditing && (
            <form onSubmit={handleSaveEdit} className="mt-4 pt-4 border-t border-white/15 space-y-4">
              {/* Aviso Obligatorio de Re-Aprobación para el usuario */}
              {isOwner && !isAdmin && (
                <div className="p-4 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-100 text-xs sm:text-sm space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Atención: Modificar tu aviso requiere nueva aprobación</span>
                  </div>
                  <p className="leading-relaxed">
                    Para preservar la calidad y seguridad de la comunidad, al guardar cambios en tu aviso pasará nuevamente al estado <strong className="text-white">PENDIENTE</strong> y deberá ser revisado y aprobado por un administrador antes de volver a ser visible en el catálogo público.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-display uppercase tracking-wider text-white/80 mb-1">
                  Título del Servicio
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white text-petroleo text-sm focus:ring-2 focus:ring-coral outline-hidden font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-display uppercase tracking-wider text-white/80 mb-1">
                  Descripción Detallada
                </label>
                <textarea
                  rows={4}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white text-petroleo text-sm focus:ring-2 focus:ring-coral outline-hidden leading-relaxed"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-display uppercase tracking-wider text-white/80 mb-1">
                    WhatsApp (Teléfono)
                  </label>
                  <input
                    type="text"
                    value={editWhatsapp}
                    onChange={(e) => setEditWhatsapp(e.target.value)}
                    placeholder="+54 9 11..."
                    className="w-full px-3.5 py-2 rounded-xl bg-white text-petroleo text-sm focus:ring-2 focus:ring-coral outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-display uppercase tracking-wider text-white/80 mb-1">
                    Email de Contacto
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="contacto@ejemplo.com"
                    className="w-full px-3.5 py-2 rounded-xl bg-white text-petroleo text-sm focus:ring-2 focus:ring-coral outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-display uppercase tracking-wider text-white/80 mb-1">
                    Web / Instagram
                  </label>
                  <input
                    type="text"
                    value={editWebUrl}
                    onChange={(e) => setEditWebUrl(e.target.value)}
                    placeholder="instagram.com/miservicio"
                    className="w-full px-3.5 py-2 rounded-xl bg-white text-petroleo text-sm focus:ring-2 focus:ring-coral outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-full bg-white/10 text-white text-xs font-display font-semibold uppercase tracking-wider hover:bg-white/20 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-display font-bold uppercase tracking-wider transition shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Guardando...' : isOwner && !isAdmin ? 'Guardar y Enviar a Aprobación' : 'Guardar Cambios'}</span>
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* Tarjeta Principal del Aviso */}
      <article
        className={`bg-white rounded-[28px] border p-6 sm:p-10 shadow-criana space-y-8 ${
          isCrianaFeatured
            ? 'border-2 border-mostaza/50 ring-2 ring-mostaza/20 bg-gradient-to-b from-[#FCFBF8] via-white to-[#F6F0E3]/30'
            : 'border-petroleo/10'
        }`}
      >
        {/* Rubros y Categorías */}
        <div className="flex flex-wrap items-center gap-2">
          {listing.category && (
            <span className="px-3.5 py-1.5 bg-arena/80 text-petroleo text-xs font-display font-semibold uppercase tracking-wider rounded-full">
              {listing.category.name}
            </span>
          )}
          {listing.subcategory && (
            <span className="px-3.5 py-1.5 bg-menta/60 text-secondary text-xs font-display font-semibold uppercase tracking-wider rounded-full">
              {listing.subcategory.name}
            </span>
          )}
        </div>

        {/* Título en Fraunces Serif */}
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-petroleo leading-tight">
          {listing.aiCorrectedTitle || listing.title}
        </h1>

        {/* Bloque de Comunidad: Quién recomienda y Escuela / Localización de origen */}
        {(() => {
          const originSchool = listing.user?.schoolOfOrigin || listing.school || listing.schoolRequest;
          const recommenderName = isCrianaFeatured
            ? 'Equipo Oficial Criana'
            : listing.user?.name || 'Familia de la comunidad';
          const recommenderEmail = isCrianaFeatured
            ? 'contacto@criana.com'
            : listing.user?.email;

          return (
            <div className="p-5 sm:p-6 rounded-2xl bg-arena/40 border border-petroleo/15 space-y-4 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-display font-bold uppercase tracking-[0.14em] text-secondary">
                <Sparkles className="w-4 h-4 text-mostaza" />
                <span>Recomendación de la Comunidad Escolar</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Recomendado por usuario y su correo */}
                <div className="flex items-start gap-3.5 p-4 rounded-xl bg-white/90 border border-petroleo/10 shadow-2xs">
                  <div className="w-10 h-10 rounded-full bg-arena flex items-center justify-center text-petroleo shrink-0 mt-0.5">
                    <User className="w-5 h-5 text-coral" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-display font-bold uppercase tracking-wider text-secondary block">
                      Recomendado por:
                    </span>
                    <p className="font-serif font-bold text-petroleo text-base leading-tight mt-0.5 truncate">
                      {recommenderName}
                    </p>

                    {recommenderEmail && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs font-sans">
                        <Mail className="w-3.5 h-3.5 text-secondary shrink-0" />
                        <a
                          href={`mailto:${recommenderEmail}`}
                          className="text-petroleo hover:text-coral underline font-medium truncate"
                          title="Contactar a quien recomienda"
                        >
                          {recommenderEmail}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Escuela y localización de donde viene la recomendación */}
                <div className="flex items-start gap-3.5 p-4 rounded-xl bg-white/90 border border-petroleo/10 shadow-2xs">
                  <div className="w-10 h-10 rounded-full bg-arena flex items-center justify-center text-petroleo shrink-0 mt-0.5">
                    <SchoolIcon className="w-5 h-5 text-mostaza" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-display font-bold uppercase tracking-wider text-secondary block">
                      Escuela y origen:
                    </span>
                    <p className="font-serif font-bold text-petroleo text-base leading-tight mt-0.5 truncate">
                      {isCrianaFeatured
                        ? 'Comunidad Escolar AMBA'
                        : originSchool?.nombre || 'Colegio de la comunidad'}
                    </p>

                    {originSchool ? (
                      <div className="mt-1.5 text-xs font-sans text-secondary space-y-0.5">
                        <div className="flex items-start gap-1">
                          <MapPin className="w-3.5 h-3.5 text-coral shrink-0 mt-0.5" />
                          <span className="text-petroleo/90 font-medium">
                            {originSchool.domicilio}
                            {originSchool.localidad ? ` • ${originSchool.localidad}` : ''}
                          </span>
                        </div>
                        <p className="pl-4 text-[11px] text-secondary">
                          {originSchool.departamento} ({originSchool.jurisdiccion})
                        </p>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs font-sans text-secondary">
                        Localización: AMBA (CABA y Gran Buenos Aires)
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Descripción */}
        <div className="space-y-4">
          <h3 className="font-display text-xs font-bold text-secondary uppercase tracking-[0.14em]">
            Sobre este servicio
          </h3>
          <p className="font-sans text-base text-petroleo/90 leading-relaxed whitespace-pre-line">
            {listing.aiCorrectedDesc || listing.description}
          </p>
        </div>

        {/* Galería de Imágenes si tiene adjuntos */}
        {listing.images && listing.images.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="font-display text-xs font-bold text-secondary uppercase tracking-[0.14em]">
              Fotos / Imágenes del servicio
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {listing.images.map((img, idx) => (
                <div
                  key={img.id || idx}
                  className="rounded-2xl overflow-hidden border border-petroleo/10 shadow-2xs bg-arena/20 aspect-video relative group"
                >
                  <img
                    src={img.url}
                    alt={`Foto ${idx + 1} del servicio`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTAs de Contacto Directo */}
        <div className="pt-8 border-t border-petroleo/10 space-y-4">
          <h3 className="font-display text-xs font-bold text-secondary uppercase tracking-[0.14em]">
            Vías de Contacto con el Anunciante
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            {listing.whatsapp && (
              <a
                href={`https://wa.me/${cleanWhatsappNumber(listing.whatsapp)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackClick('WHATSAPP')}
                className="flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-display font-bold uppercase tracking-wider shadow-sm transition-all transform hover:-translate-y-0.5"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Contactar por WhatsApp</span>
              </a>
            )}

            {listing.email && (
              <a
                href={`mailto:${listing.email}`}
                onClick={() => trackClick('EMAIL')}
                className="inline-flex items-center justify-center gap-2 py-3 px-5 bg-arena/80 hover:bg-arena text-petroleo rounded-full text-xs font-display font-semibold uppercase tracking-wider border border-petroleo/15 transition-all transform hover:-translate-y-0.5"
              >
                <Mail className="w-4 h-4 text-secondary" />
                <span>Enviar Email</span>
              </a>
            )}

            {listing.webUrl && (
              <a
                href={listing.webUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackClick('WEB')}
                className="inline-flex items-center justify-center gap-2 py-3 px-5 bg-arena/80 hover:bg-arena text-petroleo rounded-full text-xs font-display font-semibold uppercase tracking-wider border border-petroleo/15 transition-all transform hover:-translate-y-0.5"
              >
                <Globe className="w-4 h-4 text-secondary" />
                <span>Visitar Web / Red</span>
              </a>
            )}
          </div>
        </div>
      </article>

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteModal && (
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
              ¿Estás seguro de que deseás eliminar <strong className="text-slate-900">&ldquo;{listing.title}&rdquo;</strong>? La publicación dejará de existir en la comunidad escolar.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold uppercase tracking-wider transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteListing}
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

