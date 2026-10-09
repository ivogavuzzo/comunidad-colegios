'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, School as SchoolIcon, Search, HelpCircle, X, Sparkles } from 'lucide-react';
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
  }, [jurisdiccion, onSchoolChange]);

  // 2. Fetch Schools when Departamento changes or query updates
  const fetchSchools = useCallback(
    (dept: string, query: string) => {
      if (!jurisdiccion || !dept) {
        setSchools([]);
        return;
      }

      setLoadingSchools(true);
      const params = new URLSearchParams({
        jurisdiccion,
        departamento: dept,
      });

      if (query.trim()) {
        params.set('q', query.trim());
      }

      fetch(`/api/schools?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          setSchools(Array.isArray(data) ? data : []);
          setLoadingSchools(false);
        })
        .catch((err) => {
          console.error('Error fetching schools:', err);
          setLoadingSchools(false);
        });
    },
    [jurisdiccion]
  );

  useEffect(() => {
    if (selectedDepartamento) {
      const handler = setTimeout(() => {
        fetchSchools(selectedDepartamento, searchQuery);
      }, 250);
      return () => clearTimeout(handler);
    }
  }, [selectedDepartamento, searchQuery, fetchSchools]);

  // 3. Selection handler
  const handleSchoolSelect = (schoolId: string) => {
    if (schoolId === 'MISSING_SCHOOL') {
      setIsMissingModalOpen(true);
      return;
    }

    const school = schools.find((s) => s.id === schoolId) || null;
    setSelectedSchool(school);
    onSchoolChange(school);
  };

  const handleClear = () => {
    setJurisdiccion('');
    setSelectedDepartamento('');
    setDepartamentos([]);
    setSchools([]);
    setSearchQuery('');
    setSelectedSchool(null);
    onSchoolChange(null);
  };

  return (
    <div className="bg-white rounded-[24px] shadow-criana border border-petroleo/10 p-6 sm:p-8 transition-all">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5 text-petroleo">
          <div className="w-8 h-8 rounded-full bg-arena flex items-center justify-center text-mostaza">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-serif font-bold text-lg sm:text-xl text-petroleo leading-tight">
              Elegí la comunidad de tu colegio
            </h2>
            <span className="text-xs text-secondary font-sans">
              Filtrá por zona y encontrá los servicios recomendados para tu comunidad
            </span>
          </div>
        </div>
        {(jurisdiccion || selectedSchool) && (
          <button
            onClick={handleClear}
            className="text-xs font-display font-semibold uppercase tracking-wider text-secondary hover:text-coral flex items-center gap-1.5 transition"
          >
            <X className="w-3.5 h-3.5" />
            <span>Limpiar</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Nivel 1: Jurisdicción */}
        <div>
          <label className="block text-xs font-display font-bold text-secondary uppercase tracking-[0.14em] mb-2">
            1. Jurisdicción
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setJurisdiccion('CABA')}
              className={`flex-1 py-2.5 px-3 rounded-full text-xs font-display font-bold uppercase tracking-wider transition text-center ${
                jurisdiccion === 'CABA'
                  ? 'bg-petroleo text-white shadow-xs'
                  : 'border border-petroleo/20 text-petroleo hover:bg-arena/50'
              }`}
            >
              CABA
            </button>
            <button
              type="button"
              onClick={() => setJurisdiccion('GBA')}
              className={`flex-1 py-2.5 px-3 rounded-full text-xs font-display font-bold uppercase tracking-wider transition text-center ${
                jurisdiccion === 'GBA'
                  ? 'bg-petroleo text-white shadow-xs'
                  : 'border border-petroleo/20 text-petroleo hover:bg-arena/50'
              }`}
            >
              GBA
            </button>
          </div>
        </div>

        {/* Nivel 2: Comuna o Partido */}
        <div>
          <label className="block text-xs font-display font-bold text-secondary uppercase tracking-[0.14em] mb-2">
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
            className="w-full py-2.5 px-4 border border-petroleo/15 rounded-xl text-sm bg-white text-petroleo disabled:bg-arena/30 disabled:text-petroleo/40 focus:outline-none focus:ring-2 focus:ring-petroleo/20 focus:border-petroleo transition font-sans"
          >
            <option value="">
              {!jurisdiccion
                ? 'Primero seleccioná jurisdicción'
                : loadingDepto
                ? 'Cargando zonas...'
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
          <label className="block text-xs font-display font-bold text-secondary uppercase tracking-[0.14em] mb-2">
            3. Colegio con dirección
          </label>
          <select
            value={selectedSchool?.id || ''}
            onChange={(e) => handleSchoolSelect(e.target.value)}
            disabled={!selectedDepartamento || loadingSchools}
            className="w-full py-2.5 px-4 border border-petroleo/15 rounded-xl text-sm bg-white text-petroleo disabled:bg-arena/30 disabled:text-petroleo/40 focus:outline-none focus:ring-2 focus:ring-petroleo/20 focus:border-petroleo transition font-sans"
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
              <option value="MISSING_SCHOOL" className="font-semibold text-coral">
                + Mi colegio no está en la lista...
              </option>
            )}
          </select>
        </div>
      </div>

      {/* Barra de búsqueda de colegio por nombre si hay comuna elegida */}
      {selectedDepartamento && (
        <div className="mt-5 pt-4 border-t border-petroleo/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar colegio por nombre..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-petroleo/15 rounded-full bg-ivory focus:outline-none focus:ring-2 focus:ring-coral/20 focus:border-coral transition font-sans text-petroleo"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsMissingModalOpen(true)}
            className="text-xs sm:text-xs text-coral hover:text-coral-dark font-display font-bold uppercase tracking-wider flex items-center gap-1.5 transition ml-auto"
          >
            <HelpCircle className="w-4 h-4 text-coral" />
            <span>¿No encontrás tu colegio? Hacé clic acá</span>
          </button>
        </div>
      )}

      {/* Resumen del colegio seleccionado */}
      {selectedSchool && (
        <div className="mt-5 p-4 bg-menta/50 border border-petroleo/15 rounded-2xl flex items-center justify-between text-xs sm:text-sm text-petroleo">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-petroleo shadow-xs border border-petroleo/10">
              <SchoolIcon className="w-4 h-4 text-petroleo" />
            </div>
            <div>
              <span className="font-serif font-bold text-base text-petroleo block">
                {selectedSchool.nombre}
              </span>
              <span className="text-secondary text-xs font-sans">
                {selectedSchool.domicilio}, {selectedSchool.localidad} ({selectedSchool.departamento})
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedSchool(null);
              onSchoolChange(null);
            }}
            className="text-xs font-display font-bold uppercase tracking-wider text-coral hover:text-coral-dark ml-3 flex-shrink-0"
          >
            Cambiar
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
