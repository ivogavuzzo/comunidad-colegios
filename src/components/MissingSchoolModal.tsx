'use client';

import React, { useState } from 'react';
import { X, Building2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export interface MissingSchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialJurisdiccion?: 'CABA' | 'GBA' | '';
  initialDepartamento?: string;
  onRequestSubmitted?: (createdRequest: any) => void;
}

export default function MissingSchoolModal({
  isOpen,
  onClose,
  initialJurisdiccion = '',
  initialDepartamento = '',
  onRequestSubmitted,
}: MissingSchoolModalProps) {
  const [nombre, setNombre] = useState('');
  const [jurisdiccion, setJurisdiccion] = useState<'CABA' | 'GBA' | ''>(
    initialJurisdiccion || 'CABA'
  );
  const [departamento, setDepartamento] = useState(initialDepartamento || '');
  const [localidad, setLocalidad] = useState('');
  const [domicilio, setDomicilio] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!nombre.trim()) {
      setErrorMsg('Por favor ingrese el nombre del colegio.');
      return;
    }
    if (!jurisdiccion) {
      setErrorMsg('Seleccione la jurisdicción (CABA o GBA).');
      return;
    }
    if (!departamento.trim()) {
      setErrorMsg('Ingrese la Comuna o Partido correspondiente.');
      return;
    }
    if (!localidad.trim()) {
      setErrorMsg('Ingrese la localidad o barrio.');
      return;
    }
    if (!domicilio.trim()) {
      setErrorMsg('Ingrese la dirección física (calle y número).');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/schools/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          jurisdiccion,
          departamento: departamento.trim(),
          localidad: localidad.trim(),
          domicilio: domicilio.trim(),
          userEmail: userEmail.trim() || undefined,
          userName: userName.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ocurrió un error al enviar la solicitud.');
      }

      setSuccessMsg(
        '¡Solicitud enviada con éxito! Tu colegio se ha registrado en estado PENDING y será revisado por nuestro equipo.'
      );

      if (onRequestSubmitted && data.request) {
        onRequestSubmitted(data.request);
      }

      setTimeout(() => {
        handleReset();
        onClose();
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setNombre('');
    setDepartamento(initialDepartamento || '');
    setLocalidad('');
    setDomicilio('');
    setUserEmail('');
    setUserName('');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100"
          aria-label="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 id="modal-title" className="text-xl font-bold text-slate-900">
              ¿No encontrás tu colegio?
            </h2>
            <p className="text-sm text-slate-500">
              Completá estos datos para agregarlo a la comunidad escolar.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nombre Oficial del Colegio *
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Colegio Belgrano Day School, Escuela N° 12"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Jurisdicción *
              </label>
              <select
                value={jurisdiccion}
                onChange={(e) => setJurisdiccion(e.target.value as 'CABA' | 'GBA')}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                disabled={loading}
              >
                <option value="CABA">CABA (Capital Federal)</option>
                <option value="GBA">GBA (Gran Buenos Aires)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {jurisdiccion === 'CABA' ? 'Comuna *' : 'Partido *'}
              </label>
              <input
                type="text"
                required
                value={departamento}
                onChange={(e) => setDepartamento(e.target.value)}
                placeholder={jurisdiccion === 'CABA' ? 'Ej. Comuna 13' : 'Ej. San Isidro'}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Localidad / Barrio *
              </label>
              <input
                type="text"
                required
                value={localidad}
                onChange={(e) => setLocalidad(e.target.value)}
                placeholder="Ej. Belgrano, Acassuso"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Dirección Física (Domicilio) *
              </label>
              <input
                type="text"
                required
                value={domicilio}
                onChange={(e) => setDomicilio(e.target.value)}
                placeholder="Ej. Juramento 3035"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-100 pt-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Tu Nombre (Opcional)
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Ej. Laura García"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Tu Email de Contacto (Opcional)
              </label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="laura@ejemplo.com"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                disabled={loading}
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-rose-600/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <span>Solicitar Incorporación</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
