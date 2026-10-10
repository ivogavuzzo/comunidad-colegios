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
  ChevronDown,
  ChevronUp,
  Loader2,
  Filter,
  Check,
  RefreshCw,
} from 'lucide-react';
import MissingSchoolModal from './MissingSchoolModal';
import { mergeDuplicateSchools } from '@/lib/schools';
export { mergeDuplicateSchools };

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
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function CascadingSelector({
  onSchoolChange,
  selectedSchoolId,
  isOpen: controlledIsOpen,
  onToggle: controlledOnToggle,
}: CascadingSelectorProps) {
  // Support both controlled and uncontrolled open state
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const toggleOpen = () => {
    if (controlledOnToggle) {
      controlledOnToggle();
    } else {
      setInternalIsOpen((prev) => !prev);
    }
  };

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

  // Handle selection with auto-scroll and collapse accordion
  const handleSelectSchool = (school: SchoolOption) => {
    setSelectedSchool(school);
    onSchoolChange(school);

    // Auto-scroll para que el catálogo quede a la vista
    setTimeout(() => {
      if (containerRef.current) {
        const navHeight = 90;
        const rect = containerRef.current.getBoundingClientRect();
        const targetY = window.scrollY + rect.top - navHeight;
        window.scrollTo({
          top: Math.max(0, targetY),
          behavior: 'smooth',
        });
      }
    }, 60);

    // Fold accordion upon selecting to immediately showcase filtered results
    if (controlledOnToggle) {
      controlledOnToggle();
    } else {
      setInternalIsOpen(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedSchool(null);
    onSchoolChange(null);
  };

  const displayedSchools = schools.slice(0, 10);

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-[24px] shadow-criana hover:shadow-criana-hover border border-petroleo/10 transition-all duration-300 overflow-hidden scroll-mt-24"
    >
      {/* Accordion Trigger Header */}
      <div
        role="button"
        tabIndex={0}
        onClick={toggleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleOpen();
          }
        }}
        className="w-full flex items-center justify-between p-4 sm:p-5 cursor-pointer select-none group transition-colors hover:bg-arena/20"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
          {/* Cool Icon Badge */}
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-200 shadow-2xs ${
              selectedSchool
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 scale-105'
                : 'bg-arena/70 text-petroleo border border-petroleo/10 group-hover:bg-petroleo group-hover:text-white'
            }`}
          >
            <SchoolIcon className="w-5 h-5" />
          </div>

          {/* Title & Selected Preview */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-serif font-bold text-base sm:text-lg text-petroleo leading-tight">
                Colegio / Comunidad Escolar
              </h2>
              {selectedSchool && (
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>

            {/* Subtitle / Status Summary */}
            {selectedSchool ? (
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold font-sans">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate max-w-[200px] sm:max-w-md">{selectedSchool.nombre}</span>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearSelection();
                  }}
                  className="p-1 rounded-full text-secondary hover:text-coral hover:bg-coral/10 transition"
                  title="Quitar filtro de colegio"
                  aria-label="Quitar filtro de colegio"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-xs text-secondary font-sans mt-0.5 truncate">
                Todos los colegios • Hacé clic para buscar por tu comunidad escolar
              </p>
            )}
          </div>
        </div>

        {/* Right side: Badge and Chevron */}
        <div className="flex items-center gap-2.5 shrink-0">
          {selectedSchool ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-display font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Check className="w-3 h-3" />
              <span>Elegido</span>
            </span>
          ) : (
            <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-[11px] font-display font-semibold uppercase tracking-wider bg-arena/60 text-secondary border border-petroleo/10">
              Opcional
            </span>
          )}

          <div
            className={`w-9 h-9 rounded-full border border-petroleo/10 flex items-center justify-center transition-all duration-300 ${
              isOpen
                ? 'bg-petroleo text-white rotate-180 shadow-xs'
                : 'bg-arena/60 text-petroleo group-hover:bg-petroleo group-hover:text-white'
            }`}
          >
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Accordion Body */}
      {isOpen && (
        <div className="border-t border-petroleo/10 p-5 sm:p-7 space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
          {selectedSchool ? (
            /* Selected School Active Card */
            <div className="relative p-5 bg-menta/50 border-2 border-emerald-500/20 rounded-2xl text-petroleo shadow-xs animate-in fade-in duration-300 w-full overflow-hidden">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center text-emerald-600 shadow-2xs border border-petroleo/15 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-display font-bold uppercase tracking-[0.14em] text-petroleo/70">
                      Colegio actualmente seleccionado
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-lg text-petroleo leading-snug break-words">
                    {selectedSchool.nombre}
                  </h3>

                  {/* Sedes */}
                  {selectedSchool.domicilios && selectedSchool.domicilios.length > 1 ? (
                    <div className="mt-2 space-y-1">
                      <span className="text-[11px] font-display font-semibold uppercase tracking-wider text-secondary block">
                        {selectedSchool.domicilios.length} sedes unificadas:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedSchool.domicilios.map((dom, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-xs text-petroleo font-sans shadow-2xs break-words"
                          >
                            <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{dom}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-secondary font-sans break-words">
                      {selectedSchool.domicilio}
                      {selectedSchool.localidad ? `, ${selectedSchool.localidad}` : ''}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md font-semibold bg-white text-petroleo border border-petroleo/15">
                      Jurisdicción: {selectedSchool.jurisdiccion}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md font-medium bg-white text-petroleo border border-petroleo/10">
                      {selectedSchool.jurisdiccion === 'CABA' ? 'Comuna' : 'Partido'}:{' '}
                      {selectedSchool.departamentos && selectedSchool.domicilios && selectedSchool.departamentos.length > 1
                        ? selectedSchool.departamentos.join(', ')
                        : selectedSchool.departamento}
                    </span>
                  </div>

                  {/* Actions for Selected School */}
                  <div className="pt-3 flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSchool(null);
                        onSchoolChange(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-display font-semibold uppercase tracking-wider bg-white border border-petroleo/20 text-petroleo hover:bg-arena/50 transition shadow-2xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Cambiar colegio</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-display font-semibold uppercase tracking-wider bg-white border border-coral/30 text-coral hover:bg-coral/10 transition shadow-2xs"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Quitar filtro</span>
                    </button>
                    <button
                      type="button"
                      onClick={toggleOpen}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-display font-semibold uppercase tracking-wider bg-petroleo text-white hover:bg-petroleo-light transition shadow-2xs ml-auto"
                    >
                      <span>Cerrar</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* 1. Buscador por texto */}
              <div className="space-y-1.5">
                <label
                  htmlFor={searchInputId}
                  className="block text-xs font-display font-bold text-secondary uppercase tracking-[0.14em]"
                >
                  Buscar por nombre de colegio
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-secondary absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id={searchInputId}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Escribí el nombre del colegio (ej: Belgrano Day, San Martín, Goethe, La Obra...)"
                    className="w-full pl-11 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm border border-petroleo/15 rounded-2xl bg-ivory focus:bg-white text-petroleo placeholder:text-petroleo/40 focus:outline-none focus:ring-2 focus:ring-petroleo/20 focus:border-petroleo transition font-sans shadow-2xs"
                  />
                  {loadingSchools ? (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 text-petroleo/50 animate-spin" />
                    </div>
                  ) : searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-secondary hover:text-coral hover:bg-coral/10 transition"
                      title="Borrar texto de búsqueda"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>

              {/* 2. Filtros opcionales por Jurisdicción y Comuna / Partido */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-1.5 text-xs font-display font-bold text-secondary uppercase tracking-[0.14em]">
                  <Filter className="w-3.5 h-3.5 text-mostaza" />
                  <span>Filtros por zona (opcional)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
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

              {/* 3. Resultados de búsqueda de colegios */}
              {hasActiveFilterOrSearch && (
                <div className="space-y-3 pt-2 border-t border-petroleo/10 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-display font-bold text-secondary uppercase tracking-[0.14em]">
                      Resultados encontrados ({schools.length} {schools.length === 1 ? 'colegio' : 'colegios'})
                    </span>
                    {schools.length > 0 && (
                      <span className="text-[11px] text-secondary font-sans hidden sm:inline">
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
                        No encontramos colegios que coincidan con la búsqueda.
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
                      <div className="max-h-72 sm:max-h-80 overflow-y-auto pr-1 space-y-2.5 scrollbar-thin">
                        {displayedSchools.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleSelectSchool(s)}
                            className="w-full text-left p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 flex items-start justify-between gap-3 group border-petroleo/15 hover:border-petroleo/40 hover:bg-arena/30 hover:scale-[1.005] bg-white shadow-2xs"
                          >
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition bg-arena text-petroleo group-hover:bg-petroleo group-hover:text-white shadow-2xs">
                                <SchoolIcon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-serif font-bold text-sm sm:text-base text-petroleo leading-snug break-words group-hover:text-coral transition-colors">
                                  {s.nombre}
                                </h4>

                                {s.domicilios && s.domicilios.length > 1 ? (
                                  <div className="mt-1 space-y-0.5">
                                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-semibold font-sans">
                                      <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                                      <span>{s.domicilios.length} sedes</span>
                                    </div>
                                    <p className="text-xs text-secondary truncate">
                                      {s.domicilios.slice(0, 2).join(' • ')}
                                      {s.domicilios.length > 2 ? ' ...' : ''}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-xs text-secondary mt-0.5 font-sans break-words">
                                    {s.domicilio}
                                    {s.localidad ? ` • ${s.localidad}` : ''}
                                  </p>
                                )}

                                <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px] sm:text-[11px] font-sans">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded font-semibold bg-petroleo/10 text-petroleo">
                                    {s.jurisdiccion}
                                  </span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded font-medium bg-arena text-petroleo">
                                    {s.jurisdiccion === 'CABA' ? 'Comuna' : 'Partido'}:{' '}
                                    {s.departamentos && s.departamentos.length > 1
                                      ? s.departamentos.join(', ')
                                      : s.departamento}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-1.5 pl-2 self-center">
                              <span className="text-xs font-display font-semibold uppercase tracking-wider text-petroleo group-hover:text-coral transition">
                                Elegir
                              </span>
                              <ChevronRight className="w-4 h-4 text-secondary group-hover:text-coral transition" />
                            </div>
                          </button>
                        ))}
                      </div>

                      {schools.length > 10 && (
                        <p className="text-[11px] text-secondary text-center pt-1 font-sans">
                          Mostrando 10 de {schools.length} colegios. Escribí más detalles para acotar.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Guía inicial amigable cuando todavía no hay texto ni filtros */}
              {!hasActiveFilterOrSearch && (
                <div className="py-3 px-4 bg-arena/20 rounded-2xl border border-petroleo/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-secondary text-xs">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-mostaza shrink-0" />
                    <span>
                      Escribí el nombre de tu colegio o seleccioná una zona para ver las opciones disponibles.
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

              {/* Botón para cerrar */}
              <div className="pt-2 flex items-center justify-between border-t border-petroleo/10">
                {hasActiveFilterOrSearch && (
                  <button
                    type="button"
                    onClick={() => setIsMissingModalOpen(true)}
                    className="text-[11px] text-coral hover:text-coral-dark font-display font-bold uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Sumar colegio faltante</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleOpen}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-display font-semibold uppercase tracking-wider bg-petroleo text-white hover:bg-petroleo-light transition shadow-2xs ml-auto"
                >
                  <span>Cerrar filtro</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
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
