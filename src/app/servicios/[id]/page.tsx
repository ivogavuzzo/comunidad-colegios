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
} from 'lucide-react';

interface ListingDetail {
  id: string;
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
  school?: {
    id: string;
    nombre: string;
    domicilio: string;
    localidad: string;
    departamento: string;
    jurisdiccion: string;
  } | null;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
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

  // Admin edit form state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editWebUrl, setEditWebUrl] = useState('');
  const [saving, setSaving] = useState(false);

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
    try {
      const res = await fetch(`/api/listings/${listing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setListing((prev) => (prev ? { ...prev, status: updated.status } : null));
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
    try {
      const res = await fetch(`/api/listings/${listing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          description: editDesc,
          whatsapp: editWhatsapp,
          email: editEmail,
          webUrl: editWebUrl,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setListing((prev) =>
          prev
            ? {
                ...prev,
                title: updated.title,
                aiCorrectedTitle: updated.aiCorrectedTitle,
                description: updated.description,
                aiCorrectedDesc: updated.aiCorrectedDesc,
                whatsapp: updated.whatsapp,
                email: updated.email,
                webUrl: updated.webUrl,
              }
            : null
        );
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Error guardando modificaciones:', err);
    } finally {
      setSaving(false);
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

      {/* Barra de Administración exclusiva para ADMINS */}
      {isAdmin && (
        <section
          data-testid="admin-listing-control-bar"
          className="bg-petroleo text-white rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 border border-petroleo-light"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-display uppercase tracking-widest font-bold text-mostaza-light">
                Herramientas Admin:
              </span>
              {listing.status === 'APPROVED' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Activo / Visible
                </span>
              )}
              {listing.status === 'HIDDEN' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-500/20 text-slate-300 border border-slate-400/30">
                  <EyeOff className="w-3.5 h-3.5" />
                  Invisible / Desactivado
                </span>
              )}
              {listing.status === 'PENDING' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  <Clock className="w-3.5 h-3.5" />
                  Pendiente de Aprobación
                </span>
              )}
              {listing.status === 'REJECTED' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-400/30">
                  <X className="w-3.5 h-3.5" />
                  Rechazado
                </span>
              )}
            </div>

            {/* Acciones de Moderación y Edición */}
            <div className="flex items-center gap-2">
              {listing.status === 'APPROVED' ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleStatusToggle('HIDDEN')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-display font-semibold uppercase tracking-wider text-slate-200 transition"
                  title="Ocultar aviso del catálogo público"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Desactivar (Hacer Invisible)</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleStatusToggle('APPROVED')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-xs font-display font-semibold uppercase tracking-wider text-white transition shadow-xs"
                  title="Activar y hacer visible en el catálogo"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Activar / Publicar</span>
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
            </div>
          </div>

          {/* Formulario de Modificación / Edición en Línea */}
          {isEditing && (
            <form onSubmit={handleSaveEdit} className="mt-4 pt-4 border-t border-white/15 space-y-4">
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
                    type="url"
                    value={editWebUrl}
                    onChange={(e) => setEditWebUrl(e.target.value)}
                    placeholder="https://..."
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
                  <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
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

        {/* Colegio de Referencia */}
        {listing.school && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-arena/50 border border-petroleo/10">
            <SchoolIcon className="w-5 h-5 text-coral shrink-0 mt-0.5" />
            <div>
              <p className="font-serif font-bold text-petroleo text-base">
                {listing.school.nombre}
              </p>
              <p className="text-xs text-secondary font-sans mt-0.5">
                {listing.school.domicilio} • {listing.school.localidad},{' '}
                {listing.school.departamento} ({listing.school.jurisdiccion})
              </p>
            </div>
          </div>
        )}

        {/* Descripción */}
        <div className="space-y-4">
          <h3 className="font-display text-xs font-bold text-secondary uppercase tracking-[0.14em]">
            Sobre este servicio
          </h3>
          <p className="font-sans text-base text-petroleo/90 leading-relaxed whitespace-pre-line">
            {listing.aiCorrectedDesc || listing.description}
          </p>
        </div>

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
    </div>
  );
}
