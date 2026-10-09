'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Building2,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  School,
  Lock,
  UserCheck,
} from 'lucide-react';
import MissingSchoolModal from '@/components/MissingSchoolModal';

interface SchoolItem {
  id: string;
  cueanexo: string;
  nombre: string;
  domicilio: string;
  localidad: string;
  departamento: string;
  jurisdiccion: string;
}

export default function OnboardingPage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();

  // Form states
  const [dni, setDni] = useState('');
  const [dniError, setDniError] = useState<string | null>(null);

  // School selector states
  const [searchQuery, setSearchQuery] = useState('');
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolItem | null>(null);
  const [schoolError, setSchoolError] = useState<string | null>(null);

  // Modal for missing school
  const [isMissingModalOpen, setIsMissingModalOpen] = useState(false);

  // Submission states
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dev login state
  const [devEmail, setDevEmail] = useState('');
  const [devLoggingIn, setDevLoggingIn] = useState(false);

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced school search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSchools([]);
      setSearching(false);
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    setSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/schools?query=${encodeURIComponent(searchQuery.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setSchools(data);
        }
      } catch (err) {
        console.error('Error buscando colegios:', err);
      } finally {
        setSearching(false);
      }
    }, 280);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  // Validate DNI on change
  const handleDniChange = (val: string) => {
    const numeric = val.replace(/\D/g, '');
    setDni(numeric);
    if (numeric.length > 0 && (numeric.length < 7 || numeric.length > 8)) {
      setDniError('El DNI debe contener 7 u 8 números');
    } else {
      setDniError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validate DNI
    const cleanDni = dni.replace(/\D/g, '');
    if (!/^\d{7,8}$/.test(cleanDni)) {
      setDniError('El DNI debe contener entre 7 y 8 números');
      return;
    }

    // Validate School
    if (!selectedSchool) {
      setSchoolError('Por favor seleccioná tu colegio de procedencia');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dni: cleanDni,
          schoolOfOriginId: selectedSchool.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ocurrió un error al procesar el onboarding');
      }

      setSuccessMessage(
        '¡Registro completado con éxito! Redirigiendo para publicar tu aviso...'
      );

      // Attempt to refresh session metadata
      if (updateSession) {
        await updateSession();
      }

      setTimeout(() => {
        router.push('/publicar');
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al conectar con el servidor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDevSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devEmail.trim()) return;
    setDevLoggingIn(true);
    try {
      await signIn('credentials', {
        email: devEmail.trim(),
        callbackUrl: '/onboarding',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setDevLoggingIn(false);
    }
  };

  // If session is loading
  if (status === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-rose-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">
            Verificando sesión...
          </p>
        </div>
      </div>
    );
  }

  // If user is not authenticated: show sign-in prompt
  if (!session || !session.user) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 sm:p-8 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Ingreso para Anunciantes
        </h1>
        <p className="text-sm text-slate-600 mt-2 mb-6">
          Para publicar avisos en la comunidad escolar, primero iniciá sesión con tu cuenta de Google.
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

        {/* Development fast login */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-xs text-slate-400 font-medium mb-3 uppercase tracking-wider">
            Modo Desarrollo / Pruebas
          </p>
          <form onSubmit={handleDevSignIn} className="space-y-3">
            <input
              type="email"
              value={devEmail}
              onChange={(e) => setDevEmail(e.target.value)}
              placeholder="anunciante@colegio.edu.ar"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
            />
            <button
              type="submit"
              disabled={devLoggingIn || !devEmail.trim()}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition"
            >
              {devLoggingIn ? 'Ingresando...' : 'Iniciar Sesión Rápida (Test)'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // If user is already onboarded
  if (session.user.isOnboarded) {
    return (
      <div className="max-w-lg mx-auto my-12 p-8 bg-white border border-slate-200/80 rounded-2xl shadow-sm text-center">
        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <UserCheck className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          ¡Tu perfil de anunciante está completo!
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          Ya cumpliste con la validación de DNI y colegio de procedencia para la comunidad escolar.
        </p>

        {session.user.dni && (
          <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100 text-left text-xs text-slate-600 space-y-1">
            <p>
              <strong className="text-slate-800">DNI:</strong> {session.user.dni}
            </p>
            <p>
              <strong className="text-slate-800">Email:</strong> {session.user.email}
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => router.push('/publicar')}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-xs transition"
          >
            <span>Publicar un Aviso</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => router.push('/')}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition"
          >
            Volver al Catálogo
          </button>
        </div>
      </div>
    );
  }

  // Mandatory Onboarding Form
  return (
    <div className="max-w-2xl mx-auto my-8 sm:my-12 px-4">
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 sm:p-8 bg-gradient-to-br from-rose-50/70 via-white to-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
                Paso Obligatorio de Seguridad
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                Completá tu Registro de Anunciante
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-2">
            Para garantizar un entorno confiable entre familias del AMBA, solicitamos tu{' '}
            <strong className="text-slate-800">DNI argentino</strong> y tu{' '}
            <strong className="text-slate-800">colegio de procedencia</strong> antes de publicar tu primer aviso.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* DNI Input */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">
              DNI (Documento Nacional de Identidad) <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={8}
              value={dni}
              onChange={(e) => handleDniChange(e.target.value)}
              placeholder="Ej: 34567890 (7 u 8 dígitos sin puntos)"
              className={`w-full px-4 py-3 text-base border rounded-xl focus:outline-none transition ${
                dniError
                  ? 'border-rose-400 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
              }`}
            />
            {dniError ? (
              <p className="text-xs text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {dniError}
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-1.5">
                Ingresá sólo números. Requerido para verificar tu identidad en la comunidad escolar.
              </p>
            )}
          </div>

          {/* School of Origin Searchable Selector */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">
              Colegio de Procedencia <span className="text-rose-600">*</span>
            </label>

            {selectedSchool ? (
              <div className="p-4 bg-slate-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">
                      {selectedSchool.nombre}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedSchool.domicilio} — {selectedSchool.localidad} ({selectedSchool.jurisdiccion})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSchool(null);
                    setSchoolError(null);
                  }}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition"
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
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSchoolError(null);
                    }}
                    placeholder="Buscá tu colegio por nombre, calle o localidad..."
                    className="w-full pl-10 pr-10 py-3 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  />
                  {searching && (
                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin absolute right-3.5 top-3.5" />
                  )}
                </div>

                {/* Dropdown list */}
                {schools.length > 0 && (
                  <div className="mt-1.5 max-h-60 overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-lg z-20 divide-y divide-slate-100">
                    {schools.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedSchool(s);
                          setSearchQuery('');
                          setSchools([]);
                          setSchoolError(null);
                        }}
                        className="w-full text-left p-3 hover:bg-rose-50/60 flex flex-col transition"
                      >
                        <span className="font-semibold text-slate-900 text-xs sm:text-sm">
                          {s.nombre}
                        </span>
                        <span className="text-[11px] text-slate-500 mt-0.5">
                          {s.domicilio} — {s.localidad} ({s.departamento})
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery.trim().length >= 2 && !searching && schools.length === 0 && (
                  <div className="p-3 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl mt-1.5 flex items-center justify-between">
                    <span>No encontramos un colegio que coincida.</span>
                    <button
                      type="button"
                      onClick={() => setIsMissingModalOpen(true)}
                      className="text-rose-600 font-semibold hover:underline"
                    >
                      ¿No está tu colegio?
                    </button>
                  </div>
                )}
              </div>
            )}

            {schoolError && (
              <p className="text-xs text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {schoolError}
              </p>
            )}

            {!selectedSchool && (
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={() => setIsMissingModalOpen(true)}
                  className="text-xs text-slate-500 hover:text-rose-600 transition inline-flex items-center gap-1"
                >
                  <School className="w-3.5 h-3.5" />
                  <span>¿No encontrás tu colegio? Solicitá agregarlo</span>
                </button>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-sm transition"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <span>Guardar y Continuar</span>
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
        onRequestSubmitted={(request) => {
          // If request was submitted, inform user
          setSuccessMessage(
            `Solicitud para "${request.nombre}" enviada. Tu colegio se revisará en breve.`
          );
        }}
      />
    </div>
  );
}
