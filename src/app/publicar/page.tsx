'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  PlusCircle,
  Building2,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  School,
  Lock,
  ShieldAlert,
  Image as ImageIcon,
  Trash2,
  MessageCircle,
  Mail,
  Globe,
  Info,
  Upload,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  MapPin,
} from 'lucide-react';
import MissingSchoolModal from '@/components/MissingSchoolModal';
import { SchoolItem, mergeDuplicateSchools } from '@/lib/schools';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  subcategories: Array<{
    id: string;
    name: string;
    slug: string;
    orderIndex: number;
  }>;
}

export default function PublicarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Categories
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');

  // School
  const [schoolSearch, setSchoolSearch] = useState('');
  const [schoolResults, setSchoolResults] = useState<SchoolItem[]>([]);
  const [schoolSearching, setSchoolSearching] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolItem | null>(null);
  const [createdSchoolRequestId, setCreatedSchoolRequestId] = useState<string | null>(null);
  const [createdSchoolRequestName, setCreatedSchoolRequestName] = useState<string | null>(null);
  const [isMissingModalOpen, setIsMissingModalOpen] = useState(false);

  // Listing Data
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Contact Channels
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [webUrl, setWebUrl] = useState('');

  // Images
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Feedback & State
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdListing, setCreatedListing] = useState<any | null>(null);

  // Captcha & Listing Limits
  const [captchaChallenge, setCaptchaChallenge] = useState<{
    question: string;
    token: string;
  } | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [userListingCount, setUserListingCount] = useState<number>(0);
  const [maxListings, setMaxListings] = useState<number>(10);
  const [limitReached, setLimitReached] = useState<boolean>(false);

  // Search debounce ref
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load Captcha and User Listing stats
  const loadCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const res = await fetch('/api/captcha');
      if (res.ok) {
        const data = await res.json();
        setCaptchaChallenge({ question: data.question, token: data.token });
        if (typeof data.userListingCount === 'number') {
          setUserListingCount(data.userListingCount);
          setLimitReached(Boolean(data.limitReached));
          setMaxListings(data.maxListings || 10);
        }
      }
    } catch (err) {
      console.error('Error cargando verificación de seguridad:', err);
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    loadCaptcha();
  }, [session]);

  // Fetch categories on mount
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
          if (data.length > 0) {
            setSelectedCategoryId(data[0].id);
            if (data[0].subcategories?.length > 0) {
              setSelectedSubcategoryId(data[0].subcategories[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Error cargando categorías:', err);
      }
    }
    loadCategories();
  }, []);

  // Pre-load user's school of origin if session has schoolOfOriginId
  useEffect(() => {
    async function loadSchoolOfOrigin() {
      if (session?.user?.schoolOfOriginId && !selectedSchool && !createdSchoolRequestId) {
        try {
          const res = await fetch(
            `/api/schools?id=${encodeURIComponent(session.user.schoolOfOriginId)}&merge=true`
          );
          if (res.ok) {
            const list = await res.json();
            if (Array.isArray(list) && list.length > 0) {
              setSelectedSchool(list[0]);
            }
          }
        } catch (err) {
          console.error('Error cargando colegio del usuario:', err);
        }
      }
    }
    loadSchoolOfOrigin();
  }, [session]);

  // Update subcategories when category changes
  const handleCategoryChange = (catId: string) => {
    setSelectedCategoryId(catId);
    const cat = categories.find((c) => c.id === catId);
    if (cat && cat.subcategories.length > 0) {
      setSelectedSubcategoryId(cat.subcategories[0].id);
    } else {
      setSelectedSubcategoryId('');
    }
  };

  // Debounced school search
  useEffect(() => {
    if (schoolSearch.trim().length < 2) {
      setSchoolResults([]);
      setSchoolSearching(false);
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    setSchoolSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/schools?query=${encodeURIComponent(schoolSearch.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setSchoolResults(mergeDuplicateSchools(data));
        }
      } catch (err) {
        console.error('Error buscando colegios:', err);
      } finally {
        setSchoolSearching(false);
      }
    }, 280);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [schoolSearch]);

  const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so user can re-select same file if needed
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      setImageError('El archivo debe ser una imagen válida (JPG, PNG o WebP).');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setImageError(
        `La imagen supera el límite de 2 MB (tamaño: ${sizeMb} MB). Por favor seleccioná una imagen de hasta 2 MB.`
      );
      return;
    }

    if (images.length >= 5) {
      setImageError('Se permite un máximo de 5 imágenes por aviso.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImages((prev) => [...prev, reader.result as string]);
        setImageError(null);
      }
    };
    reader.onerror = () => {
      setImageError('Error al procesar la imagen. Intentá nuevamente.');
    };
    reader.readAsDataURL(file);
  };

  // Add image helper
  const handleAddImage = () => {
    if (!imageUrlInput.trim()) return;
    if (images.length >= 5) {
      setImageError('Se permite un máximo de 5 imágenes por aviso.');
      return;
    }
    setImages([...images, imageUrlInput.trim()]);
    setImageUrlInput('');
    setImageError(null);
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setImageError(null);
  };

  // Submit listing
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Title validation
    if (title.trim().length < 5) {
      setFormError('El título debe tener al menos 5 caracteres');
      return;
    }
    if (title.trim().length > 100) {
      setFormError('El título no puede superar los 100 caracteres');
      return;
    }

    // Description validation
    if (description.trim().length < 20) {
      setFormError('La descripción debe tener al menos 20 caracteres');
      return;
    }
    if (description.trim().length > 2000) {
      setFormError('La descripción no puede superar los 2000 caracteres');
      return;
    }

    // Category & Subcategory
    if (!selectedCategoryId) {
      setFormError('Por favor seleccioná una categoría');
      return;
    }
    if (!selectedSubcategoryId) {
      setFormError('Por favor seleccioná una subcategoría');
      return;
    }

    // School validation
    if (!selectedSchool && !createdSchoolRequestId) {
      setFormError('Por favor asociá tu aviso a un colegio existente o solicitado');
      return;
    }

    // Contact channels validation
    let normalizedWebUrl = webUrl.trim();
    if (normalizedWebUrl && !/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i.test(normalizedWebUrl)) {
      normalizedWebUrl = `https://${normalizedWebUrl}`;
    }

    const hasWhatsapp = Boolean(whatsapp && whatsapp.trim());
    const hasEmail = Boolean(email && email.trim());
    const hasWeb = Boolean(normalizedWebUrl);

    if (!hasWhatsapp && !hasEmail && !hasWeb) {
      setFormError('Debes ingresar al menos un canal de contacto (WhatsApp, Email o Web)');
      return;
    }

    if (hasWhatsapp && !/^(\+?549\d{10}|\d{10,11})$/.test(whatsapp.replace(/[\s\-\(\)]/g, ''))) {
      setFormError('El formato del número de WhatsApp es inválido');
      return;
    }

    if (hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('El formato del correo electrónico es inválido');
      return;
    }

    if (limitReached) {
      setFormError(
        'Has alcanzado el límite máximo de 10 avisos. Si necesitás publicar más avisos, por favor contactá al administrador en contacto@criana.com.'
      );
      return;
    }

    if (!captchaAnswer.trim()) {
      setFormError('Por favor respondé la pregunta de verificación de seguridad.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          categoryId: selectedCategoryId,
          subcategoryId: selectedSubcategoryId,
          schoolId: selectedSchool?.id,
          schoolRequestId: createdSchoolRequestId,
          whatsapp: hasWhatsapp ? whatsapp.trim() : undefined,
          email: hasEmail ? email.trim() : undefined,
          webUrl: hasWeb ? normalizedWebUrl : undefined,
          images: images.length > 0 ? images : undefined,
          captchaToken: captchaChallenge?.token,
          captchaAnswer: captchaAnswer.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Refresh captcha on failure so user gets a fresh challenge
        loadCaptcha();
        if (res.status === 403 && data.redirectUrl) {
          router.push(data.redirectUrl);
          return;
        }
        throw new Error(data.error || 'Error al procesar la publicación');
      }

      setUserListingCount((prev) => prev + 1);
      setCaptchaAnswer('');
      setCreatedListing(data.listing);
    } catch (err: any) {
      setFormError(err.message || 'Error al comunicarse con el servidor');
    } finally {
      setSubmitting(false);
    }
  };

  // If loading session
  if (status === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-rose-600 animate-spin" />
      </div>
    );
  }

  // Not authenticated
  if (!session || !session.user) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-slate-200/80 rounded-2xl shadow-sm text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Iniciá sesión para publicar
        </h1>
        <p className="text-sm text-slate-600 mt-2 mb-6">
          Para ofrecer servicios a la comunidad escolar, accedé con tu cuenta verificada de Google.
        </p>
        <button
          onClick={() => signIn('google')}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-slate-700 font-semibold text-sm shadow-xs transition"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continuar con Google</span>
        </button>
      </div>
    );
  }

  // Not onboarded gate interception
  if (!session.user.isOnboarded) {
    return (
      <div className="max-w-lg mx-auto my-12 p-8 bg-white border border-rose-200 rounded-2xl shadow-sm text-center">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Onboarding Obligatorio Requerido
        </h1>
        <p className="text-sm text-slate-600 mt-3 leading-relaxed">
          Para garantizar la seguridad de las familias escolares en nuestra comunidad, todos los anunciantes deben registrar su{' '}
          <strong className="text-slate-900">DNI</strong> y su{' '}
          <strong className="text-slate-900">colegio de procedencia</strong> antes de publicar su primer aviso.
        </p>

        <div className="mt-8">
          <button
            onClick={() => router.push('/onboarding')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-xs transition"
          >
            <span>Completar Onboarding Ahora</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Success view
  if (createdListing) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-slate-200/80 rounded-2xl shadow-sm text-center">
        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
          Estado: PENDIENTE DE MODERACIÓN
        </span>
        <h1 className="text-2xl font-bold text-slate-900 mt-4">
          ¡Aviso creado exitosamente!
        </h1>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          Tu publicación ha sido guardada en estado <strong className="text-slate-900">PENDIENTE</strong>. Nuestro equipo revisará el aviso y nuestro asistente inteligente de IA verificará la ortografía preservando el tono escolar antes de publicarlo en el catálogo comunitario.
        </p>

        <div className="mt-6 p-4 bg-slate-50 border border-slate-100 rounded-xl text-left text-xs space-y-1">
          <p>
            <strong className="text-slate-800">Título:</strong> {createdListing.title}
          </p>
          <p>
            <strong className="text-slate-800">Colegio:</strong>{' '}
            {createdListing.school?.nombre || createdSchoolRequestName || 'Colegio solicitado'}
          </p>
          <p>
            <strong className="text-slate-800">Categoría:</strong>{' '}
            {createdListing.category?.name}
          </p>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => router.push('/')}
            className="px-5 py-2.5 bg-petroleo hover:bg-petroleo/90 text-white rounded-xl text-sm font-semibold shadow-xs transition"
          >
            Ir al Catálogo Público
          </button>
          <button
            onClick={() => {
              setCreatedListing(null);
              setTitle('');
              setDescription('');
              setWhatsapp('');
              setEmail('');
              setWebUrl('');
              setImages([]);
            }}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition"
          >
            Publicar Otro Aviso
          </button>
        </div>
      </div>
    );
  }

  // Active Category object
  const activeCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <div className="max-w-3xl mx-auto my-8 sm:my-12 px-4">
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 sm:p-8 bg-gradient-to-br from-arena/30 via-white to-menta/20 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-petroleo text-white flex items-center justify-center shadow-xs">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-petroleo uppercase tracking-wider">
                Comunidad Escolar AMBA
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                Publicar un Aviso Comunitario
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
            Compartí tu servicio con las familias de tu colegio o de colegios vecinos. Todos los avisos son moderados y revisados para mantener un directorio seguro y colaborativo.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {/* Indicador de límite de avisos por usuario */}
          {limitReached ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex items-start gap-3 text-amber-950">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold text-amber-900">
                  Límite máximo de avisos alcanzado ({userListingCount} de {maxListings})
                </p>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Has alcanzado el límite permitido de {maxListings} avisos por usuario. Para mantener el equilibrio y la calidad de los servicios en la comunidad escolar, el sistema limita las publicaciones simultáneas. Si tu actividad requiere publicar más avisos, por favor contactá al administrador a{' '}
                  <a
                    href="mailto:contacto@criana.com?subject=Solicitud%20de%20aumento%20de%20l%C3%ADmite%20de%20avisos"
                    className="font-bold underline text-amber-950 hover:text-black"
                  >
                    contacto@criana.com
                  </a>{' '}
                  para solicitar una ampliación.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-xl text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span>
                  Avisos publicados:{' '}
                  <strong className="text-slate-900 font-semibold">{userListingCount}</strong> de{' '}
                  <strong className="text-slate-900 font-semibold">{maxListings}</strong> permitidos
                </span>
              </div>
              <a
                href="mailto:contacto@criana.com?subject=Consulta%20sobre%20l%C3%ADmite%20de%20avisos"
                className="text-petroleo hover:text-petroleo/80 font-medium hover:underline self-end sm:self-auto"
              >
                ¿Necesitás publicar más? Contactá al admin
              </a>
            </div>
          )}

          {formError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* 1. Categoría y Subcategoría */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Categoría <span className="text-rose-600">*</span>
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-petroleo focus:ring-2 focus:ring-petroleo/20"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Subcategoría <span className="text-rose-600">*</span>
              </label>
              <select
                value={selectedSubcategoryId}
                onChange={(e) => setSelectedSubcategoryId(e.target.value)}
                disabled={!activeCategory || activeCategory.subcategories.length === 0}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-petroleo focus:ring-2 focus:ring-petroleo/20 disabled:opacity-50"
              >
                {activeCategory?.subcategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Colegio Asociado */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">
              Colegio relacionado <span className="text-rose-600">*</span>
            </label>

            {selectedSchool ? (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-start gap-2.5">
                  <Building2 className="w-4 h-4 text-petroleo mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900 text-xs sm:text-sm">
                      {selectedSchool.nombre}
                    </h4>
                    {selectedSchool.domicilios && selectedSchool.domicilios.length > 1 ? (
                      <div className="mt-1 space-y-0.5">
                        <span className="inline-flex items-center text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                          {selectedSchool.domicilios.length} sedes:
                        </span>
                        <ul className="text-xs text-slate-600 space-y-0.5 pl-1">
                          {selectedSchool.domicilios.map((dom, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span className="text-emerald-600 font-bold">•</span>
                              <span>{dom}</span>
                            </li>
                          ))}
                        </ul>
                        <span className="text-[10px] text-slate-400 block pt-0.5">
                          {selectedSchool.jurisdiccion === 'CABA' ? 'Ciudad de Buenos Aires' : selectedSchool.localidad} ({selectedSchool.departamentos?.join(', ') || selectedSchool.departamento})
                        </span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500">
                        {selectedSchool.domicilio} — {selectedSchool.localidad} ({selectedSchool.departamento})
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSchool(null);
                    setCreatedSchoolRequestId(null);
                  }}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold hover:underline shrink-0 ml-2"
                >
                  Cambiar
                </button>
              </div>
            ) : createdSchoolRequestId ? (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                <div className="flex items-start gap-2.5">
                  <Building2 className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-amber-900 text-xs sm:text-sm">
                      {createdSchoolRequestName} (Colegio solicitado en revisión)
                    </h4>
                    <p className="text-[11px] text-amber-700">
                      Tu aviso quedará vinculado y se activará junto con la revisión.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCreatedSchoolRequestId(null);
                    setCreatedSchoolRequestName(null);
                  }}
                  className="text-xs text-amber-800 font-semibold hover:underline shrink-0 ml-2"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={schoolSearch}
                    onChange={(e) => setSchoolSearch(e.target.value)}
                    placeholder="Buscá el colegio por nombre o localidad..."
                    className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-petroleo focus:ring-2 focus:ring-petroleo/20"
                  />
                  {schoolSearching && (
                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin absolute right-3.5 top-3.5" />
                  )}
                </div>

                {schoolResults.length > 0 && (
                  <div className="mt-1.5 max-h-64 overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-lg z-20 divide-y divide-slate-100">
                    {schoolResults.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedSchool(s);
                          setSchoolSearch('');
                          setSchoolResults([]);
                        }}
                        className="w-full text-left p-3 hover:bg-emerald-50/40 flex flex-col transition group"
                      >
                        <span className="font-semibold text-slate-900 text-xs sm:text-sm group-hover:text-emerald-800">
                          {s.nombre}
                        </span>

                        {s.domicilios && s.domicilios.length > 1 ? (
                          <div className="mt-1.5 space-y-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                              <MapPin className="w-3 h-3 text-emerald-600" />
                              <span>{s.domicilios.length} sedes:</span>
                            </span>
                            <ul className="text-xs text-slate-600 space-y-0.5 pl-1.5">
                              {s.domicilios.map((dom, idx) => (
                                <li key={idx} className="flex items-start gap-1.5">
                                  <span className="text-emerald-600 font-bold select-none">•</span>
                                  <span>{dom}</span>
                                </li>
                              ))}
                            </ul>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2 pt-0.5">
                              <span>Jurisdicción: {s.jurisdiccion}</span>
                              <span>•</span>
                              <span>
                                {s.jurisdiccion === 'CABA' ? 'Comuna' : 'Partido'}:{' '}
                                {s.departamentos && s.departamentos.length > 1
                                  ? s.departamentos.join(', ')
                                  : s.departamento}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 mt-0.5">
                            {s.domicilio} — {s.localidad} ({s.departamento})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>Asociá el aviso a la comunidad educativa destinataria.</span>
                  <button
                    type="button"
                    onClick={() => setIsMissingModalOpen(true)}
                    className="text-petroleo font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    <School className="w-3.5 h-3.5" />
                    <span>¿No encontrás el colegio?</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. Título */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-slate-800">
                Título del Aviso <span className="text-rose-600">*</span>
              </label>
              <span className="text-xs text-slate-400">
                {title.length}/100 (mínimo 5)
              </span>
            </div>
            <input
              type="text"
              value={title}
              maxLength={100}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Clases particulares de matemática y apoyo escolar"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-petroleo focus:ring-2 focus:ring-petroleo/20"
            />
          </div>

          {/* 4. Descripción */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-slate-800">
                Descripción Detallada <span className="text-rose-600">*</span>
              </label>
              <span className="text-xs text-slate-400">
                {description.length}/2000 (mínimo 20)
              </span>
            </div>
            <textarea
              rows={4}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contale a las familias sobre tu experiencia, días, horarios o cómo podés ayudarlas. Podés usar expresiones cotidianas del cole (compas, seño, viandas, etc.)."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-petroleo focus:ring-2 focus:ring-petroleo/20"
            />
          </div>

          {/* 5. Canales de Contacto */}
          <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Canales de Contacto Directo <span className="text-rose-600">*</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ingresá al menos uno de los tres canales para que las familias puedan comunicarse con vos.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {/* WhatsApp */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="WhatsApp: Ej: +54 9 11 1234-5678 o 1112345678"
                  className="flex-1 px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Email */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email de contacto: Ej: contacto@ejemplo.com"
                  className="flex-1 px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Web / Red Social */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={webUrl}
                  onChange={(e) => setWebUrl(e.target.value)}
                  onBlur={() => {
                    const trimmed = webUrl.trim();
                    if (trimmed && !/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i.test(trimmed)) {
                      setWebUrl(`https://${trimmed}`);
                    }
                  }}
                  placeholder="Sitio Web o Red Social: Ej: instagram.com/miservicio o www.miweb.com"
                  className="flex-1 px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
            </div>
          </div>

          {/* 6. Imágenes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-slate-800">
                Imágenes del Aviso (opcional, hasta 5)
              </label>
              <span className="text-xs text-slate-400">
                {images.length}/5 imágenes
              </span>
            </div>

            {/* Input oculto de archivo */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Dropzone / Botón para adjuntar imagen */}
            <div className="space-y-3">
              <div
                onClick={() => {
                  if (images.length < 5) {
                    fileInputRef.current?.click();
                  }
                }}
                className={`p-5 rounded-2xl border-2 border-dashed transition flex flex-col items-center justify-center text-center cursor-pointer ${
                  images.length >= 5
                    ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                    : 'border-petroleo/20 hover:border-coral hover:bg-arena/30 bg-ivory'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-arena flex items-center justify-center text-coral mb-2 shadow-2xs">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-petroleo font-sans">
                  Hacé clic acá para adjuntar una imagen desde tu dispositivo
                </p>
                <p className="text-xs text-secondary font-sans mt-0.5">
                  Formatos permitidos: JPG, PNG, WebP • <strong>Máximo 2 MB por imagen</strong>
                </p>
              </div>

              {/* Mensaje de error si la imagen supera 2 MB */}
              {imageError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{imageError}</span>
                </div>
              )}

              {/* Opción alternativa para pegar URL */}
              <div className="flex gap-2 items-center pt-1">
                <input
                  type="url"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  placeholder="O pegá la URL web de una imagen (https://...)"
                  className="flex-1 px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-petroleo focus:ring-2 focus:ring-petroleo/20 font-sans"
                />
                <button
                  type="button"
                  onClick={handleAddImage}
                  disabled={!imageUrlInput.trim() || images.length >= 5}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition"
                >
                  Agregar URL
                </button>
              </div>
            </div>

            {/* Miniaturas de imágenes adjuntas */}
            {images.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-xl border border-slate-200 overflow-hidden aspect-video bg-slate-100 shadow-2xs"
                  >
                    <img
                      src={img}
                      alt={`Imagen ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="p-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition"
                        title="Eliminar imagen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                      #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. Control de Seguridad Anti-Spam (Captcha) */}
          <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-bold text-slate-800">
                  Verificación de Seguridad Anti-Spam
                </span>
              </div>
              <button
                type="button"
                onClick={loadCaptcha}
                disabled={captchaLoading}
                title="Generar nuevo cálculo de seguridad"
                className="text-xs text-petroleo hover:text-petroleo/80 flex items-center gap-1 font-semibold transition"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${captchaLoading ? 'animate-spin' : ''}`}
                />
                <span>Cambiar cálculo</span>
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Para garantizar que los avisos provengan de personas reales y proteger a las familias contra spam, resolvé la siguiente cuenta:
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
              <div className="inline-flex items-center justify-center px-4 py-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-800 text-sm tracking-wider select-none shadow-2xs">
                {captchaLoading
                  ? 'Cargando cálculo...'
                  : captchaChallenge
                  ? captchaChallenge.question
                  : '¿Cuánto es 5 + 3?'}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Tu resultado"
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  disabled={limitReached}
                  required
                  className="w-36 px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-petroleo focus:ring-2 focus:ring-petroleo/20 font-medium bg-white shadow-2xs"
                />
                <span className="text-xs text-slate-500 font-sans">
                  (sólo el número)
                </span>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 shrink-0" />
              Al publicar, tu aviso quedará en estado PENDING para moderación.
            </span>

            <button
              type="submit"
              disabled={submitting || limitReached}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-petroleo hover:bg-petroleo/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold shadow-xs transition"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : limitReached ? (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  <span>Límite Alcanzado (10/10)</span>
                </>
              ) : (
                <>
                  <span>Publicar Aviso</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Fallback Missing School Modal */}
      <MissingSchoolModal
        isOpen={isMissingModalOpen}
        onClose={() => setIsMissingModalOpen(false)}
        initialJurisdiccion="CABA"
        onRequestSubmitted={(req) => {
          setCreatedSchoolRequestId(req.id);
          setCreatedSchoolRequestName(req.nombre);
          setSelectedSchool(null);
        }}
      />
    </div>
  );
}
