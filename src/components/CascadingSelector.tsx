'use client';

import React, { useState, useEffect, useCallback, useId, useRef } from 'react';
import {
  MapPin,
  School as SchoolIcon,
  Search,
  HelpCircle,
  X,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Filter,
} from 'lucide-react';
import MissingSchoolModal from './MissingSchoolModal';

export interface SchoolOption {
  id: string;
  ids?: string[];
  cueanexo: string;
  cueanexos?: string[];
  nombre: string;
  domicilio: string;
  domicilios?: string[];
  localidad: string;
  localidades?: string[];
  departamento: string;
  departamentos?: string[];
  jurisdiccion: string;
}

export interface CascadingSelectorProps {
  onSchoolChange: (school: SchoolOption | null) => void;
  selectedSchoolId?: string | null;
}

import { mergeDuplicateSchools } from '@/lib/schools';
export { mergeDuplicateSchools };

export default function CascadingSelector({
  onSchoolChange,
  selectedSchoolId,
}: CascadingSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [jurisdiccion, setJurisdiccion] = useState<'CABA' | 'GBA' | ''>('');
  const [departamentos, setDepartamentos] = useState<string[]>([]);
  const [selectedDepartamento, setSelectedDepartamento] = useState<string>('');
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<SchoolOption | null>(null);

  const [loadingDepto, setLoadingDepto] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [isMissingModalOpen, setIsMissingModalOpen] = useState(false);

  const searchInputId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with selectedSchoolId prop if cleared externally
  useEffect(() => {
    if (selectedSchoolId === null && selectedSchool !== null) {
      setSelectedSchool(null);
    }
  }, [selectedSchoolId, selectedSchool]);

  // 1. Fetch Departamentos when Jurisdiccion changes
  useEffect(() => {
    if (!jurisdiccion) {
      setDepartamentos([]);
      setSelectedDepartamento('');
      return;
    }

    let isMounted = true;
    setLoadingDepto(true);
    setSelectedDepartamento('');

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

  // 2. Fetch schools whenever search query or filters change
  const hasActiveFilterOrSearch =
    searchQuery.trim().length > 0 || Boolean(jurisdiccion) || Boolean(selectedDepartamento);

  const fetchSchools = useCallback(
    (query: string, jur: string, dept: string) => {
      const q = query.trim();
      // Only fetch if user typed something or set a filter
      if (!q && !jur && !dept) {
        setSchools([]);
        setLoadingSchools(false);
        return;
      }

      setLoadingSchools(true);
      const params = new URLSearchParams();
      if (jur) params.set('jurisdiccion', jur);
      if (dept) params.set('departamento', dept);
      if (q) params.set('q', q);
      // Fetch generous count before merging duplicates
      params.set('limit', '50');

      fetch(`/api/schools?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          const raw = Array.isArray(data) ? data : [];
          const merged = mergeDuplicateSchools(raw);
          setSchools(merged);
          setLoadingSchools(false);
        })
        .catch((err) => {
          console.error('Error fetching schools:', err);
          setSchools([]);
          setLoadingSchools(false);
        });
    },
    []
  );

  useEffect(() => {
    if (!hasActiveFilterOrSearch) {
      setSchools([]);
      setLoadingSchools(false);
      return;
    }

    const handler = setTimeout(() => {
      fetchSchools(searchQuery, jurisdiccion, selectedDepartamento);
    }, 250);

    return () => clearTimeout(handler);
  }, [searchQuery, jurisdiccion, selectedDepartamento, hasActiveFilterOrSearch, fetchSchools]);

  // Handle selection with auto-scroll
  const handleSelectSchool = (school: SchoolOption) => {
    setSelectedSchool(school);
    onSchoolChange(school);

    // Auto-scroll para que el colegio seleccionado quede arriba y se visibilicen los servicios
    setTimeout(() => {
      if (containerRef.current) {
        const navHeight = 90; // Altura del Navbar sticky (80px) + margen
        const rect = containerRef.current.getBoundingClientRect();
        const targetY = window.scrollY + rect.top - navHeight;
        window.scrollTo({
          top: Math.max(0, targetY),
          behavior: 'smooth',
        });
      }
    }, 60);
  };

  const handleClearSelection = () => {
    setSelectedSchool(null);
    onSchoolChange(null);
  };

  const handleClearAll = () => {
    setSearchQuery('');
    setJurisdiccion('');
    setSelectedDepartamento('');
    setDepartamentos([]);
    setSchools([]);
    setSelectedSchool(null);
    onSchoolChange(null);
  };

  // Limit displayed results to a reasonable amount ("lista no muy grande")
  const displayedSchools = schools.slice(0, 10);

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-[24px] shadow-criana border border-petroleo/10 p-6 sm:p-8 transition-all space-y-6 scroll-mt-24"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-petroleo">
          <div className="w-10 h-10 rounded-full bg-arena flex items-center justify-center text-mostaza shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif font-bold text-lg sm:text-xl text-petroleo leading-tight">
              Elegí la comunidad de tu colegio
            </h2>
            <p className="text-xs sm:text-sm text-secondary font-sans mt-0.5">
              Buscá por nombre o filtrá por zona para encontrar recomendaciones de familias
            </p>
          </div>
        </div>

        {(hasActiveFilterOrSearch || selectedSchool) && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs font-display font-semibold uppercase tracking-wider text-secondary hover:text-coral flex items-center gap-1.5 transition px-3 py-1.5 rounded-full hover:bg-coral/5"
            title="Limpiar búsqueda y filtros"
          >
            <X className="w-3.5 h-3.5" />
            <span>Limpiar</span>
          </button>
        )}
      </div>

      {/* Resumen destacado del colegio seleccionado cuando ya fue elegido */}
      {selectedSchool && (
        <div className="p-4 sm:p-5 bg-menta/50 border-2 border-petroleo/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-petroleo shadow-xs animate-in fade-in duration-300">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-petroleo shadow-xs border border-petroleo/15 shrink-0">
              <CheckCircle2 className="w-5 h-5 text-petroleo" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-display font-bold uppercase tracking-[0.14em] text-petroleo/70">
                  Comunidad activa
                </span>
              </div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-petroleo leading-tight truncate">
                {selectedSchool.nombre}
              </h3>

              {/* Muestra las sedes en la confirmación */}
              {selectedSchool.domicilios && selectedSchool.domicilios.length > 1 ? (
                <div className="mt-2 space-y-1">
                  <span className="text-[11px] font-display font-semibold uppercase tracking-wider text-secondary block">
                    {selectedSchool.domicilios.length} sedes registradas:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSchool.domicilios.map((dom, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-petroleo/15 text-xs text-petroleo font-sans shadow-2xs"
                      >
                        <MapPin className="w-3 h-3 text-coral shrink-0" />
                        <span>{dom}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-secondary font-sans truncate mt-0.5">
                  {selectedSchool.domicilio}
                  {selectedSchool.localidad ? `, ${selectedSchool.localidad}` : ''}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-1.5 mt-2.5 text-[11px]">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold bg-white text-petroleo border border-petroleo/15">
                  Jurisdicción: {selectedSchool.jurisdiccion}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md font-medium bg-white text-petroleo border border-petroleo/10">
                  {selectedSchool.jurisdiccion === 'CABA' ? 'Comuna' : 'Partido'}:{' '}
                  {selectedSchool.departamentos && selectedSchool.domicilios && selectedSchool.departamentos.length > 1
                    ? selectedSchool.departamentos.join(', ')
                    : selectedSchool.departamento}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={handleClearSelection}
              className="px-3.5 py-1.5 rounded-full text-xs font-display font-bold uppercase tracking-wider text-coral hover:bg-coral/10 border border-coral/30 transition"
            >
              Cambiar colegio
            </button>
          </div>
        </div>
      )}

      {/* 1. Buscador por texto (en primer lugar) */}
      <div className="space-y-2">
        <label
          htmlFor={searchInputId}
          className="block text-xs font-display font-bold text-secondary uppercase tracking-[0.14em]"
        >
          {selectedSchool ? 'Buscar otro colegio' : '1. Buscador por nombre de colegio'}
        </label>
        <div className="relative">
          <Search className="w-5 h-5 text-secondary absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id={searchInputId}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (selectedSchool) {
                setSelectedSchool(null);
                onSchoolChange(null);
              }
            }}
            placeholder="Escribí el nombre del colegio (ej: Belgrano Day, San Martín, La Obra, Goethe...)"
            className="w-full pl-12 pr-11 py-3 sm:py-3.5 text-sm sm:text-base border border-petroleo/20 rounded-2xl bg-ivory focus:bg-white text-petroleo placeholder:text-petroleo/40 focus:outline-none focus:ring-2 focus:ring-petroleo/20 focus:border-petroleo transition font-sans shadow-xs"
          />
          {loadingSchools ? (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 text-petroleo/50 animate-spin" />
            </div>
          ) : searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                if (selectedSchool) {
                  setSelectedSchool(null);
                  onSchoolChange(null);
                }
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-secondary hover:text-coral hover:bg-coral/10 transition"
              title="Borrar texto de búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* 2. Filtros opcionales por Jurisdicción y Partido / Comuna */}
      <div className="space-y-2 pt-2 border-t border-petroleo/10">
        <div className="flex items-center gap-1.5 text-xs font-display font-bold text-secondary uppercase tracking-[0.14em]">
          <Filter className="w-3.5 h-3.5 text-mostaza" />
          <span>2. Filtros por zona (opcional)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Jurisdicción */}
          <div>
            <label className="block text-[11px] font-sans font-medium text-secondary/80 mb-1.5">
              Jurisdicción
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setJurisdiccion('')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition text-center ${
                  jurisdiccion === ''
                    ? 'bg-petroleo text-white shadow-xs'
                    : 'border border-petroleo/20 text-petroleo hover:bg-arena/50 bg-white'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setJurisdiccion('CABA')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition text-center ${
                  jurisdiccion === 'CABA'
                    ? 'bg-petroleo text-white shadow-xs'
                    : 'border border-petroleo/20 text-petroleo hover:bg-arena/50 bg-white'
                }`}
              >
                CABA
              </button>
              <button
                type="button"
                onClick={() => setJurisdiccion('GBA')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition text-center ${
                  jurisdiccion === 'GBA'
                    ? 'bg-petroleo text-white shadow-xs'
                    : 'border border-petroleo/20 text-petroleo hover:bg-arena/50 bg-white'
                }`}
              >
                GBA
              </button>
            </div>
          </div>

          {/* Comuna o Partido */}
          <div>
            <label className="block text-[11px] font-sans font-medium text-secondary/80 mb-1.5">
              {jurisdiccion === 'CABA'
                ? 'Comuna en CABA'
                : jurisdiccion === 'GBA'
                ? 'Partido en GBA'
                : 'Comuna o Partido'}
            </label>
            <select
              value={selectedDepartamento}
              onChange={(e) => setSelectedDepartamento(e.target.value)}
              disabled={!jurisdiccion || loadingDepto}
              className="w-full py-2 px-3.5 border border-petroleo/20 rounded-xl text-xs sm:text-sm bg-white text-petroleo disabled:bg-arena/30 disabled:text-petroleo/40 focus:outline-none focus:ring-2 focus:ring-petroleo/20 focus:border-petroleo transition font-sans"
            >
              <option value="">
                {!jurisdiccion
                  ? 'Elegí CABA o GBA para filtrar por zona'
                  : loadingDepto
                  ? 'Cargando zonas...'
                  : `Todas las ${jurisdiccion === 'CABA' ? 'comunas' : 'partidos'}`}
              </option>
              {departamentos.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Lista de resultados a medida que se busca o se filtran colegios (se colapsa si ya hay un colegio seleccionado) */}
      {hasActiveFilterOrSearch && !selectedSchool && (
        <div className="space-y-3 pt-2 border-t border-petroleo/10 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-display font-bold text-secondary uppercase tracking-[0.14em]">
              Resultados de búsqueda ({schools.length} colegios)
            </span>
            {schools.length > 0 && (
              <span className="text-[11px] text-secondary font-sans">
                Hacé clic en un colegio para seleccionarlo
              </span>
            )}
          </div>

          {loadingSchools ? (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-2 text-secondary">
              <Loader2 className="w-6 h-6 animate-spin text-petroleo" />
              <p className="text-xs font-sans">Buscando colegios en la base oficial...</p>
            </div>
          ) : schools.length === 0 ? (
            <div className="py-6 px-4 bg-arena/30 rounded-2xl border border-petroleo/10 text-center space-y-3">
              <p className="text-xs sm:text-sm text-petroleo font-sans">
                No encontramos colegios que coincidan con los criterios ingresados.
              </p>
              <button
                type="button"
                onClick={() => setIsMissingModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-display font-bold text-coral hover:text-coral-dark uppercase tracking-wider transition"
              >
                <HelpCircle className="w-4 h-4" />
                <span>¿No encontrás tu colegio? Hacé clic acá para sumarlo</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="max-h-80 sm:max-h-96 overflow-y-auto pr-1 space-y-2.5 scrollbar-thin">
                {displayedSchools.map((s) => {
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectSchool(s)}
                      className="w-full text-left p-4 rounded-2xl border transition flex items-start justify-between gap-3 group border-petroleo/15 hover:border-petroleo/50 hover:bg-arena/30 bg-white"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition bg-arena text-petroleo group-hover:bg-petroleo group-hover:text-white">
                          <SchoolIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-serif font-bold text-sm sm:text-base text-petroleo truncate">
                            {s.nombre}
                          </h4>

                          {/* Direcciones mergeadas en el mismo tile */}
                          {s.domicilios && s.domicilios.length > 1 ? (
                            <div className="mt-1.5 space-y-1">
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-semibold font-sans">
                                <MapPin className="w-3 h-3 text-emerald-600" />
                                <span>{s.domicilios.length} sedes:</span>
                              </div>
                              <ul className="space-y-0.5 pl-1 text-xs text-secondary font-sans">
                                {s.domicilios.map((dom, idx) => (
                                  <li key={idx} className="flex items-start gap-1.5">
                                    <span className="text-emerald-600 font-bold select-none">•</span>
                                    <span className="text-petroleo/90 font-medium">{dom}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <p className="text-xs text-secondary truncate mt-0.5 font-sans">
                              {s.domicilio}
                              {s.localidad ? ` • ${s.localidad}` : ''}
                            </p>
                          )}

                          {/* Jurisdicción y Partido correspondiente */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-2.5 text-[11px] font-sans">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold bg-petroleo/10 text-petroleo border border-petroleo/15">
                              Jurisdicción: {s.jurisdiccion}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-medium bg-arena text-petroleo border border-petroleo/10">
                              {s.jurisdiccion === 'CABA' ? 'Comuna' : 'Partido'}:{' '}
                              {s.departamentos && s.departamentos.length > 1
                                ? s.departamentos.join(', ')
                                : s.departamento}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2 pl-2 self-center">
                        <div className="text-secondary group-hover:text-petroleo transition p-1">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {schools.length > 10 && (
                <p className="text-[11px] text-secondary text-center pt-1 font-sans">
                  Mostrando los primeros 10 colegios de {schools.length}. Escribí más letras o filtrá
                  por zona para acotar.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Guía inicial amigable si aún no empezó a buscar ni filtrar */}
      {!hasActiveFilterOrSearch && !selectedSchool && (
        <div className="py-4 px-5 bg-arena/20 rounded-2xl border border-petroleo/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-secondary text-xs">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-mostaza shrink-0" />
            <span>
              Ingresá el nombre de tu colegio arriba o seleccioná una jurisdicción para ver los resultados.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsMissingModalOpen(true)}
            className="text-coral hover:text-coral-dark font-display font-bold uppercase tracking-wider text-[11px] shrink-0"
          >
            ¿No encontrás tu colegio?
          </button>
        </div>
      )}

      {/* Link al modal si hay resultados visibles o búsqueda activa */}
      {hasActiveFilterOrSearch && schools.length > 0 && !selectedSchool && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => setIsMissingModalOpen(true)}
            className="text-[11px] text-coral hover:text-coral-dark font-display font-bold uppercase tracking-wider flex items-center gap-1.5 transition"
          >
            <HelpCircle className="w-3.5 h-3.5 text-coral" />
            <span>¿No encontrás tu colegio en la lista? Hacé clic acá</span>
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
