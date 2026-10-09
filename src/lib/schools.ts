export interface SchoolItem {
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

/**
 * Normalizes text removing accents, punctuation and multiple spaces
 */
export function normalizeSchoolName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\.\,\-\_]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Merges duplicate school occurrences that belong to the same establishment
 * (same name and jurisdiction) into a single option with all distinct addresses.
 */
export function mergeDuplicateSchools(rawSchools: SchoolItem[]): SchoolItem[] {
  const mergedMap = new Map<string, SchoolItem>();

  for (const s of rawSchools) {
    const normName = normalizeSchoolName(s.nombre);
    const jur = (s.jurisdiccion || '').trim().toUpperCase();
    const cueBase = s.cueanexo ? s.cueanexo.substring(0, 7) : '';

    // Agrupación por mismo nombre y misma jurisdicción:
    // - En CABA: se agrupan por nombre normalizado + CABA (sedes del mismo colegio dentro de la capital).
    // - En GBA: se agrupan por CUE base (anexos) o por nombre + partido.
    const key =
      jur === 'CABA'
        ? `${normName}|CABA`
        : cueBase
        ? `${normName}|GBA|${cueBase}`
        : `${normName}|GBA|${(s.departamento || '').trim().toLowerCase()}`;

    const existing = mergedMap.get(key);
    if (!existing) {
      mergedMap.set(key, {
        ...s,
        ids: [s.id],
        cueanexos: s.cueanexo ? [s.cueanexo] : [],
        domicilios: s.domicilio ? [s.domicilio] : [],
        localidades: s.localidad ? [s.localidad] : [],
        departamentos: s.departamento ? [s.departamento] : [],
      });
    } else {
      if (!existing.ids?.includes(s.id)) {
        existing.ids?.push(s.id);
      }
      if (s.cueanexo && !existing.cueanexos?.includes(s.cueanexo)) {
        existing.cueanexos?.push(s.cueanexo);
      }
      if (s.domicilio && !existing.domicilios?.includes(s.domicilio)) {
        existing.domicilios?.push(s.domicilio);
      }
      if (s.localidad && !existing.localidades?.includes(s.localidad)) {
        existing.localidades?.push(s.localidad);
      }
      if (s.departamento && !existing.departamentos?.includes(s.departamento)) {
        existing.departamentos?.push(s.departamento);
      }
    }
  }

  return Array.from(mergedMap.values());
}
