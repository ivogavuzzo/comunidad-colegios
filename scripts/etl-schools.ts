import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { prisma } from '../src/lib/prisma';

export const GBA_24_PARTIDOS = [
  'ALMIRANTE BROWN',
  'AVELLANEDA',
  'BERAZATEGUI',
  'ESTEBAN ECHEVERRIA',
  'EZEIZA',
  'FLORENCIO VARELA',
  'GENERAL SAN MARTIN',
  'HURLINGHAM',
  'ITUZAINGO',
  'JOSE C. PAZ',
  'LA MATANZA',
  'LANUS',
  'LOMAS DE ZAMORA',
  'MALVINAS ARGENTINAS',
  'MERLO',
  'MORENO',
  'MORON',
  'QUILMES',
  'SAN FERNANDO',
  'SAN ISIDRO',
  'SAN MIGUEL',
  'TIGRE',
  'TRES DE FEBRERO',
  'VICENTE LOPEZ',
] as const;

export const GBA_24_SET = new Set<string>(GBA_24_PARTIDOS);

export function toTitleCase(str: string): string {
  if (!str) return '';
  const clean = str.replace(/\s+/g, ' ').trim();
  const lowerWords = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'en', 'y', 'a', 'al', 'o', 'por', 'con', 'e']);
  const keepUpper = new Set([
    'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV',
    'CABA', 'GBA', 'DNI', 'Nº', 'N°', 'C.E.N.S.', 'E.E.T.', 'E.P.', 'E.E.S.', 'I.S.F.D.', 'I.S.F.T.', 'UBA', 'UTN'
  ]);

  return clean
    .split(' ')
    .map((word, index) => {
      const up = word.toUpperCase();
      if (keepUpper.has(up) || up.startsWith('Nº') || up.startsWith('N°')) return up;
      if (index > 0 && lowerWords.has(word.toLowerCase())) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export function cleanPhone(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (
    trimmed === '' ||
    trimmed.includes('S/D') ||
    trimmed.includes('N/D') ||
    trimmed.length < 5
  ) {
    return null;
  }
  return trimmed;
}

export function cleanEmail(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed.includes('S/D') || trimmed.includes('N/D')) return null;
  const first = trimmed.split(/[\/;]/)[0]?.trim().toLowerCase();
  return first && first.includes('@') ? first : null;
}

export interface RawCsvRow {
  Jurisdicción: string;
  Sector: string;
  Ámbito: string;
  Departamento: string;
  'Código de departamento': string;
  Localidad: string;
  'Código de localidad': string;
  Cueanexo: string;
  Nombre: string;
  Domicilio: string;
  'C. P.': string;
  Teléfono: string;
  Mail: string;
}

export interface SchoolRecord {
  cueanexo: string;
  nombre: string;
  domicilio: string;
  jurisdiccion: 'CABA' | 'GBA';
  departamento: string;
  localidad: string;
  codigoPostal: string | null;
  telefono: string | null;
  mail: string | null;
  sector: string | null;
  ambito: string | null;
}

export interface EtlStats {
  totalRows: number;
  cabaCount: number;
  gbaCount: number;
  totalAmba: number;
  laPlataExcluded: number;
  otherProvincesExcluded: number;
  totalExcluded: number;
}

export async function parseAndFilterSchools(csvFilePath: string): Promise<{
  records: SchoolRecord[];
  stats: EtlStats;
}> {
  const fileStream = fs.createReadStream(csvFilePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let headers: string[] | null = null;
  const records: SchoolRecord[] = [];

  const stats: EtlStats = {
    totalRows: 0,
    cabaCount: 0,
    gbaCount: 0,
    totalAmba: 0,
    laPlataExcluded: 0,
    otherProvincesExcluded: 0,
    totalExcluded: 0,
  };

  for await (const line of rl) {
    if (!line.trim()) continue;
    const parts = line.split(';');

    if (!headers) {
      headers = parts.map((h) => h.replace(/^\uFEFF/, '').trim());
      continue;
    }

    stats.totalRows++;
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = (parts[index] || '').trim();
    });

    const jur = row['Jurisdicción'] || '';
    const rawDepto = row['Departamento'] || '';
    const upperDepto = rawDepto.toUpperCase();

    let isAmba = false;
    let jurisdiccion: 'CABA' | 'GBA' | null = null;

    if (jur === 'Ciudad de Buenos Aires') {
      isAmba = true;
      jurisdiccion = 'CABA';
      stats.cabaCount++;
    } else if (jur === 'Buenos Aires') {
      if (GBA_24_SET.has(upperDepto)) {
        isAmba = true;
        jurisdiccion = 'GBA';
        stats.gbaCount++;
      } else if (upperDepto === 'LA PLATA') {
        stats.laPlataExcluded++;
        stats.totalExcluded++;
      } else {
        stats.otherProvincesExcluded++;
        stats.totalExcluded++;
      }
    } else {
      stats.otherProvincesExcluded++;
      stats.totalExcluded++;
    }

    if (!isAmba || !jurisdiccion) continue;

    const departamento =
      jurisdiccion === 'CABA'
        ? rawDepto.trim()
        : toTitleCase(rawDepto);

    const localidad =
      jurisdiccion === 'CABA'
        ? 'Ciudad de Buenos Aires'
        : toTitleCase(row['Localidad'] || '');

    const sectorUpper = (row['Sector'] || '').toUpperCase();
    const sector =
      sectorUpper === 'PRIVADO'
        ? 'PRIVADO'
        : sectorUpper === 'ESTATAL'
        ? 'ESTATAL'
        : null;

    const ambitoUpper = (row['Ámbito'] || '').toUpperCase();
    const ambito =
      ambitoUpper === 'RURAL'
        ? 'RURAL'
        : ambitoUpper === 'URBANO'
        ? 'URBANO'
        : null;

    records.push({
      cueanexo: row['Cueanexo'].trim(),
      nombre: toTitleCase(row['Nombre']),
      domicilio: toTitleCase(row['Domicilio']),
      jurisdiccion,
      departamento,
      localidad,
      codigoPostal: row['C. P.']?.trim() || null,
      telefono: cleanPhone(row['Teléfono']),
      mail: cleanEmail(row['Mail']),
      sector,
      ambito,
    });
  }

  stats.totalAmba = stats.cabaCount + stats.gbaCount;
  return { records, stats };
}

export async function runEtl(csvFilePath?: string) {
  const resolvedPath =
    csvFilePath ||
    process.env.CSV_PATH ||
    'c:\\Users\\USUARIO\\My Drive\\Gemini\\colegios_2026.csv';

  console.log(`[ETL] Iniciando procesamiento de colegios AMBA desde: ${resolvedPath}`);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`[ETL] Archivo no encontrado en: ${resolvedPath}`);
  }

  const { records, stats } = await parseAndFilterSchools(resolvedPath);

  console.log(`[ETL] Total de filas analizadas: ${stats.totalRows}`);
  console.log(`[ETL] CABA cargados: ${stats.cabaCount}`);
  console.log(`[ETL] GBA 24 Partidos cargados: ${stats.gbaCount}`);
  console.log(`[ETL] Total universo AMBA: ${stats.totalAmba}`);
  console.log(`[ETL] Excluidos La Plata: ${stats.laPlataExcluded}`);
  console.log(`[ETL] Excluidos otras provincias: ${stats.otherProvincesExcluded}`);
  console.log(`[ETL] Total excluidos: ${stats.totalExcluded}`);

  if (stats.totalAmba !== 11823) {
    throw new Error(
      `[ETL] ERROR CRÍTICO: Se esperaban exactamente 11.823 colegios AMBA, pero se obtuvieron ${stats.totalAmba}`
    );
  }

  console.log(`[ETL] Insertando ${records.length} registros en la base de datos...`);

  // Limpiar tabla antes de recarga para garantizar idempotencia
  await prisma.school.deleteMany({});

  const BATCH_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const chunk = records.slice(i, i + BATCH_SIZE);
    await prisma.school.createMany({
      data: chunk,
    });
    inserted += chunk.length;
    if (inserted % 2000 === 0 || inserted === records.length) {
      console.log(`[ETL] Progreso: ${inserted} / ${records.length} colegios insertados`);
    }
  }

  const finalDbCount = await prisma.school.count();
  console.log(`[ETL] Verificación final en base de datos: ${finalDbCount} colegios persistidos.`);
  return { stats, dbCount: finalDbCount };
}

if (require.main === module || process.argv[1]?.includes('etl-schools')) {
  runEtl()
    .then(() => {
      console.log('[ETL] Pipeline completado exitosamente.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[ETL] Error durante la ejecución del pipeline:', err);
      process.exit(1);
    });
}
