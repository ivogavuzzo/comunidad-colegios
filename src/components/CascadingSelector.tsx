'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, School as SchoolIcon, Search, HelpCircle, X, ChevronRight } from 'lucide-react';
import MissingSchoolModal from './MissingSchoolModal';

export interface SchoolOption {
  id: string;
  cueanexo: string;
  nombre: string;
  domicilio: string;
  localidad: string;
  departamento: string;
  jurisdiccion: string;
}

export interface CascadingSelectorProps {
  onSchoolChange: (school: SchoolOption | null) => void;
  selectedSchoolId?: string | null;
}

export default function CascadingSelector({
  onSchoolChange,
  selectedSchoolId,
}: CascadingSelectorProps) {
  const [jurisdiccion, setJurisdiccion] = useState<'CABA' | 'GBA' | ''>('');
  const [departamentos, setDepartamentos] = useState<string[]>([]);
  const [selectedDepartamento, setSelectedDepartamento] = useState<string>('');
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<SchoolOption | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [loadingDepto, setLoadingDepto] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [isMissingModalOpen, setIsMissingModalOpen] = useState(false);

  // 1. Fetch Departamentos when Jurisdiccion changes
  useEffect(() => {
    if (!jurisdiccion) {
      setDepartamentos([]);
      setSelectedDepartamento('');
      setSchools([]);
      setSelectedSchool(null);
      onSchoolChange(null);
      return;
    }

    let isMounted = true;
    setLoadingDepto(true);
    setSelectedDepartamento('');
    setSchools([]);
    setSelectedSchool(null);
    onSchoolChange(null);

    fetch(`/api/schools?jurisdiccion=${jurisdiccion}&mode=departamentos`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setDepartamentos(Array.isArray(data) ? data : []);
          setLoadingDepto(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching departamentos:', err);
        if (isMounted) setLoadingDepto(false);
      });

    return () => {
      isMounted = false;
    };
  }, [jurisdiccion]);

  // 2. Fetch Schools when Departamento or Search Query changes
  const fetchSchools = useCallback(async () => {
    if (!jurisdiccion || !selectedDepartamento) {
      setSchools([]);
      return;
    }

    setLoadingSchools(true);
    try {
      const params = new URLSearchParams({
        jurisdiccion,
        departamento: selectedDepartamento,
      });
      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim());
      }

      const res = await fetch(`/api/schools?${params.toString()}`);
      const data = await res.json();
      setSchools(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching schools:', err);
    } finally {
      setLoadingSchools(false);
    }
  }, [jurisdiccion, selectedDepartamento, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSchools();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchSchools]);

  const handleSchoolSelect = (schoolId: string) => {
    if (schoolId === 'MISSING_SCHOOL') {
      setIsMissingModalOpen(true);
      return;
    }
    const found = schools.find((s) => s.id === schoolId) || null;
    setSelectedSchool(found);
    onSchoolChange(found);
  };

  const handleClear = () => {
    setJurisdiccion('');
    setSelectedDepartamento('');
    setSearchQuery('');
    setSelectedSchool(null);
    onSchoolChange(null);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-6 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-slate-800 font-semibold text-base sm:text-lg">
          <MapPin className="w-5 h-5 text-rose-500" />
          <span>Elegí la comunidad de tu colegio</span>
        </div>
        {(jurisdiccion || selectedSchool) && (
          <button
            onClick={handleClear}
            className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1 font-medium transition"
          >
            <X className="w-3.5 h-3.5" />
            <span>Limpiar filtros</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Nivel 1: Jurisdicción */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            1. Jurisdicción
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setJurisdiccion('CABA')}
              className={`flex-1 py-2.5 px-3 rounded-xl border text-sm font-medium transition text-center ${
                jurisdiccion === 'CABA'
                  ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm ring-1 ring-rose-500'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              CABA
            </button>
            <button
              type="button"
              onClick={() => setJurisdiccion('GBA')}
              className={`flex-1 py-2.5 px-3 rounded-xl border text-sm font-medium transition text-center ${
                jurisdiccion === 'GBA'
                  ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm ring-1 ring-rose-500'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              GBA
            </button>
          </div>
        </div>

        {/* Nivel 2: Comuna o Partido */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            2. {jurisdiccion === 'CABA' ? 'Comuna' : 'Partido'}
          </label>
          <select
            value={selectedDepartamento}
            onChange={(e) => {
              setSelectedDepartamento(e.target.value);
              setSelectedSchool(null);
              onSchoolChange(null);
            }}
            disabled={!jurisdiccion || loadingDepto}
            className="w-full py-2.5 px-3.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
          >
            <option value="">
              {!jurisdiccion
                ? 'Primero seleccioná jurisdicción'
                : loadingDepto
                ? 'Cargando...'
                : `Seleccioná ${jurisdiccion === 'CABA' ? 'Comuna' : 'Partido'}`}
            </option>
            {departamentos.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* Nivel 3: Colegio con dirección física */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            3. Colegio con dirección
          </label>
          <select
            value={selectedSchool?.id || ''}
            onChange={(e) => handleSchoolSelect(e.target.value)}
            disabled={!selectedDepartamento || loadingSchools}
            className="w-full py-2.5 px-3.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
          >
            <option value="">
              {!selectedDepartamento
                ? 'Elegí comuna/partido'
                : loadingSchools
                ? 'Cargando colegios...'
                : 'Seleccioná un colegio...'}
            </option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre} — {s.domicilio} ({s.localidad})
              </option>
            ))}
            {selectedDepartamento && (
              <option value="MISSING_SCHOOL" className="font-semibold text-rose-600">
                + Mi colegio no está en la lista...
              </option>
            )}
          </select>
        </div>
      </div>

      {/* Barra de búsqueda de colegio por nombre si hay comuna elegida */}
      {selectedDepartamento && (
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre de colegio..."
              className="w-full pl-9 pr-3.5 py-1.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsMissingModalOpen(true)}
            className="text-xs sm:text-sm text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1.5 transition ml-auto"
          >
            <HelpCircle className="w-4 h-4" />
            <span>¿No encontrás tu colegio? Hacé clic acá</span>
          </button>
        </div>
      )}

      {/* Resumen del colegio seleccionado */}
      {selectedSchool && (
        <div className="mt-4 p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-xl flex items-center justify-between text-xs sm:text-sm text-rose-950">
          <div className="flex items-center gap-2.5">
            <SchoolIcon className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <div>
              <span className="font-bold">{selectedSchool.nombre}</span>
              <span className="text-slate-600 ml-2">
                • {selectedSchool.domicilio}, {selectedSchool.localidad} ({selectedSchool.departamento})
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedSchool(null);
              onSchoolChange(null);
            }}
            className="text-rose-700 hover:text-rose-900 font-medium ml-3 flex-shrink-0"
          >
            Quitar
          </button>
        </div>
      )}

      <MissingSchoolModal
        isOpen={isMissingModalOpen}
        onClose={() => setIsMissingModalOpen(false)}
        initialJurisdiccion={jurisdiccion}
        initialDepartamento={selectedDepartamento}
        onRequestSubmitted={(newReq) => {
          console.log('Colegio solicitado:', newReq);
        }}
      />
    </div>
  );
}
