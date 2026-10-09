import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export const LEGAL_BANNER_TEXT =
  'Aviso Legal: Comunidades de Colegios es una plataforma comunitaria de contacto directo entre familias escolares. Cada anunciante es único responsable por sus servicios. La plataforma no intermedia ni asume responsabilidad por las transacciones o acuerdos realizados.';

export const INSTITUTIONAL_FOOTER_TEXT = 'Esta comunidad es una iniciativa de Criana';

export const ARGENTINE_SCHOOL_SLANG_WORDS = [
  'seño',
  'profe',
  'viandas',
  'wsp',
  'chicos',
  'compas',
  'burbuja',
  'cole',
  'mamis y papis',
  'sala de 4',
  'egresados',
] as const;

// -------------------------------------------------------------
// DNI Validation
// -------------------------------------------------------------
export function sanitizeAndValidateDni(rawDni: string): {
  isValid: boolean;
  cleanDni: string;
  error?: string;
} {
  if (!rawDni) {
    return { isValid: false, cleanDni: '', error: 'El DNI es obligatorio' };
  }
  const cleanDni = rawDni.replace(/\D/g, '');
  if (!/^\d{7,8}$/.test(cleanDni)) {
    return {
      isValid: false,
      cleanDni,
      error: 'El DNI debe contener entre 7 y 8 números',
    };
  }
  return { isValid: true, cleanDni };
}

// -------------------------------------------------------------
// Contact Channels Validation
// -------------------------------------------------------------
export function validateWhatsApp(phone: string): boolean {
  if (!phone) return false;
  const clean = phone.replace(/[\s\-\(\)]/g, '');
  // Matches +549... or 549... or 10-11 digits Argentine mobile
  return /^(\+?549\d{10}|\d{10,11})$/.test(clean);
}

export function normalizeWhatsApp(phone: string): string {
  const clean = phone.replace(/[\s\-\(\)]/g, '');
  if (clean.startsWith('+549')) return clean;
  if (clean.startsWith('549')) return `+${clean}`;
  if (clean.startsWith('11') || clean.length === 10) return `+549${clean}`;
  return clean;
}

export function validateEmail(email: string): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validateWebUrl(url: string): boolean {
  if (!url) return false;
  return /^https?:\/\/.+/i.test(url.trim());
}

export function validateContactChannels(channels: {
  whatsapp?: string | null;
  email?: string | null;
  webUrl?: string | null;
}): { isValid: boolean; error?: string } {
  const hasWhatsapp = Boolean(channels.whatsapp && channels.whatsapp.trim());
  const hasEmail = Boolean(channels.email && channels.email.trim());
  const hasWeb = Boolean(channels.webUrl && channels.webUrl.trim());

  if (!hasWhatsapp && !hasEmail && !hasWeb) {
    return {
      isValid: false,
      error: 'Debes ingresar al menos un canal de contacto (WhatsApp, Email o Web)',
    };
  }

  if (hasWhatsapp && !validateWhatsApp(channels.whatsapp!)) {
    return { isValid: false, error: 'Formato de WhatsApp inválido' };
  }
  if (hasEmail && !validateEmail(channels.email!)) {
    return { isValid: false, error: 'Formato de Email inválido' };
  }
  if (hasWeb && !validateWebUrl(channels.webUrl!)) {
    return { isValid: false, error: 'Formato de Web URL inválido' };
  }

  return { isValid: true };
}

// -------------------------------------------------------------
// Listing Content Validation
// -------------------------------------------------------------
export function validateListingPayload(payload: {
  title: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
  schoolId?: string | null;
  schoolRequestId?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  webUrl?: string | null;
  images?: string[];
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!payload.title || payload.title.trim().length < 5) {
    errors.push('El título debe tener al menos 5 caracteres');
  } else if (payload.title.trim().length > 100) {
    errors.push('El título no puede superar los 100 caracteres');
  }

  if (!payload.description || payload.description.trim().length < 20) {
    errors.push('La descripción debe tener al menos 20 caracteres');
  } else if (payload.description.trim().length > 2000) {
    errors.push('La descripción no puede superar los 2000 caracteres');
  }

  if (!payload.categoryId) errors.push('La categoría es requerida');
  if (!payload.subcategoryId) errors.push('La subcategoría es requerida');
  if (!payload.schoolId && !payload.schoolRequestId) {
    errors.push('Debe asociarse a un colegio existente o solicitado');
  }

  const channelVal = validateContactChannels({
    whatsapp: payload.whatsapp,
    email: payload.email,
    webUrl: payload.webUrl,
  });
  if (!channelVal.isValid) {
    errors.push(channelVal.error!);
  }

  if (payload.images && payload.images.length > 5) {
    errors.push('No se permiten más de 5 imágenes por aviso');
  }

  return { isValid: errors.length === 0, errors };
}

// -------------------------------------------------------------
// Cryptographic One-Time Token (OTP) Engine
// -------------------------------------------------------------
export function generate256BitOtpToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function createListingModerationTokens(listingId: string): Promise<{
  approveToken: string;
  rejectToken: string;
  expiresAt: Date;
}> {
  const approveToken = generate256BitOtpToken();
  const rejectToken = generate256BitOtpToken();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

  await prisma.moderationOtpToken.createMany({
    data: [
      {
        token: approveToken,
        listingId,
        action: 'APPROVE',
        expiresAt,
      },
      {
        token: rejectToken,
        listingId,
        action: 'REJECT',
        expiresAt,
      },
    ],
  });

  return { approveToken, rejectToken, expiresAt };
}

export interface OtpExecutionResult {
  success: boolean;
  httpStatus: number;
  message: string;
  listingId?: string;
  action?: 'APPROVE' | 'REJECT';
  listingStatus?: string;
  processedAt?: Date;
}

export async function executeModerationOtpAction(
  token: string,
  clientIp = '127.0.0.1'
): Promise<OtpExecutionResult> {
  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    const tokenRecord = await tx.moderationOtpToken.findUnique({
      where: { token },
      include: { listing: true },
    });

    if (!tokenRecord) {
      return {
        success: false,
        httpStatus: 404,
        message: 'Token inválido o no encontrado',
      };
    }

    if (tokenRecord.usedAt !== null) {
      return {
        success: false,
        httpStatus: 409,
        message:
          'El token OTP es de uso único: al reutilizarse devuelve un mensaje claro de estado ya procesado.',
        listingId: tokenRecord.listingId,
        listingStatus: tokenRecord.listing.status,
        processedAt: tokenRecord.usedAt,
      };
    }

    if (tokenRecord.expiresAt < now) {
      return {
        success: false,
        httpStatus: 410,
        message: 'El token de moderación ha expirado',
        listingId: tokenRecord.listingId,
      };
    }

    // Atomic consumption: check usedAt is still null
    const updatedCount = await tx.moderationOtpToken.updateMany({
      where: { id: tokenRecord.id, usedAt: null },
      data: {
        usedAt: now,
        usedByIp: clientIp,
      },
    });

    if (updatedCount.count === 0) {
      return {
        success: false,
        httpStatus: 409,
        message:
          'El token OTP es de uso único: al reutilizarse devuelve un mensaje claro de estado ya procesado.',
        listingId: tokenRecord.listingId,
        listingStatus: tokenRecord.listing.status,
        processedAt: now,
      };
    }

    // Invalidate sibling token for this listing
    await tx.moderationOtpToken.updateMany({
      where: {
        listingId: tokenRecord.listingId,
        id: { not: tokenRecord.id },
        usedAt: null,
      },
      data: {
        usedAt: now,
        usedByIp: `${clientIp}-sibling-invalidated`,
      },
    });

    const newStatus = tokenRecord.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const updateData: Record<string, any> = {
      status: newStatus,
    };
    if (newStatus === 'APPROVED') {
      if (tokenRecord.listing.aiCorrectedTitle) {
        updateData.title = tokenRecord.listing.aiCorrectedTitle;
      }
      if (tokenRecord.listing.aiCorrectedDesc) {
        updateData.description = tokenRecord.listing.aiCorrectedDesc;
      }
    }

    await tx.listing.update({
      where: { id: tokenRecord.listingId },
      data: updateData,
    });

    return {
      success: true,
      httpStatus: 200,
      message:
        tokenRecord.action === 'APPROVE'
          ? 'Publicación aprobada exitosamente'
          : 'Publicación rechazada exitosamente',
      listingId: tokenRecord.listingId,
      action: tokenRecord.action as 'APPROVE' | 'REJECT',
      listingStatus: newStatus,
      processedAt: now,
    };
  });
}

// -------------------------------------------------------------
// Gemini AI Simulation & Prompt Invariants
// -------------------------------------------------------------
export interface GeminiCorrectionResult {
  correctedTitle: string;
  correctedDescription: string;
  isFlagged: boolean;
  flagReason: string | null;
}

export function simulateGeminiAiCorrection(input: {
  title: string;
  description: string;
}): GeminiCorrectionResult {
  const isFlagged =
    /violencia|droga|estafa|pornografia|arma/i.test(input.title) ||
    /violencia|droga|estafa|pornografia|arma/i.test(input.description);

  let correctedTitle = input.title
    .replace(/\bqe\b|\bq\b/gi, 'que')
    .replace(/\bxq\b/gi, 'porque')
    .replace(/\s+/g, ' ')
    .trim();
  correctedTitle =
    correctedTitle.charAt(0).toUpperCase() + correctedTitle.slice(1);

  let correctedDescription = input.description
    .replace(/\bqe\b|\bq\b/gi, 'que')
    .replace(/\bxq\b/gi, 'porque')
    .replace(/\s+/g, ' ')
    .trim();
  correctedDescription =
    correctedDescription.charAt(0).toUpperCase() + correctedDescription.slice(1);

  return {
    correctedTitle,
    correctedDescription,
    isFlagged,
    flagReason: isFlagged ? 'Contenido potencialmente inapropiado o fraudulento' : null,
  };
}

// -------------------------------------------------------------
// Contact Click Tracking Engine
// -------------------------------------------------------------
export function hashClientIp(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

export async function recordContactClick(payload: {
  listingId: string;
  channel: 'WHATSAPP' | 'EMAIL' | 'WEB';
  ip?: string;
  userAgent?: string;
}): Promise<{ success: boolean; eventId: string; ipHash?: string }> {
  const ipHash = payload.ip ? hashClientIp(payload.ip) : undefined;
  const event = await prisma.contactClick.create({
    data: {
      listingId: payload.listingId,
      channel: payload.channel,
      ipHash: ipHash ?? null,
      userAgent: payload.userAgent ?? null,
    },
  });

  return { success: true, eventId: event.id, ipHash };
}

// -------------------------------------------------------------
// Admin Metrics Aggregator
// -------------------------------------------------------------
export async function computeAdminMetrics() {
  const totalListings = await prisma.listing.count();
  const approvedListings = await prisma.listing.count({ where: { status: 'APPROVED' } });
  const pendingListings = await prisma.listing.count({ where: { status: 'PENDING' } });
  const rejectedListings = await prisma.listing.count({ where: { status: 'REJECTED' } });

  const totalClicks = await prisma.contactClick.count();
  const whatsappClicks = await prisma.contactClick.count({ where: { channel: 'WHATSAPP' } });
  const emailClicks = await prisma.contactClick.count({ where: { channel: 'EMAIL' } });
  const webClicks = await prisma.contactClick.count({ where: { channel: 'WEB' } });

  return {
    totalListings,
    listingsByStatus: {
      APPROVED: approvedListings,
      PENDING: pendingListings,
      REJECTED: rejectedListings,
    },
    totalClicks,
    clicksByChannel: {
      WHATSAPP: whatsappClicks,
      EMAIL: emailClicks,
      WEB: webClicks,
    },
  };
}

// -------------------------------------------------------------
// Cascading Query Helpers
// -------------------------------------------------------------
export async function getCascadingJurisdictions(): Promise<string[]> {
  const records = await prisma.school.groupBy({
    by: ['jurisdiccion'],
  });
  return records.map((r) => r.jurisdiccion).sort();
}

export async function getCascadingDepartamentos(
  jurisdiccion: string
): Promise<string[]> {
  const records = await prisma.school.groupBy({
    by: ['departamento'],
    where: { jurisdiccion },
  });
  return records.map((r) => r.departamento).sort();
}

export async function getCascadingSchools(filter: {
  jurisdiccion: string;
  departamento: string;
  query?: string;
}) {
  const where: any = {
    jurisdiccion: filter.jurisdiccion,
    departamento: filter.departamento,
  };

  if (filter.query && filter.query.trim()) {
    where.nombre = {
      contains: filter.query.trim(),
    };
  }

  const schools = await prisma.school.findMany({
    where,
    select: {
      id: true,
      cueanexo: true,
      nombre: true,
      domicilio: true,
      localidad: true,
      departamento: true,
      jurisdiccion: true,
    },
    take: 50,
    orderBy: { nombre: 'asc' },
  });

  return schools;
}

export function formatSchoolOption(school: {
  nombre: string;
  domicilio: string;
}): string {
  return `${school.nombre} — ${school.domicilio}`;
}

// -------------------------------------------------------------
// Public Catalog Query with Criana Pinning Rule
// -------------------------------------------------------------
export async function getPublicCatalogListings(filter: {
  categoryId: string;
  subcategoryId?: string;
  schoolId?: string;
}) {
  const category = await prisma.category.findUnique({
    where: { id: filter.categoryId },
  });

  const isChildcare = category?.slug === 'cuidado-infantil';

  const where: any = {
    categoryId: filter.categoryId,
    status: 'APPROVED',
  };

  if (filter.subcategoryId) {
    where.subcategoryId = filter.subcategoryId;
  }

  if (filter.schoolId) {
    // Return listings belonging to school OR permanent featured Criana
    where.OR = [
      { schoolId: filter.schoolId },
      { isPermanentFeatured: true },
    ];
  }

  let listings = await prisma.listing.findMany({
    where,
    include: {
      category: true,
      subcategory: true,
      school: true,
    },
    orderBy: [
      { isPermanentFeatured: 'desc' },
      { pinnedPosition: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  // Strict Criana head-pinning guarantee in Childcare
  if (isChildcare) {
    const crianaIndex = listings.findIndex((l) => l.isPermanentFeatured);
    if (crianaIndex > 0) {
      const [crianaItem] = listings.splice(crianaIndex, 1);
      listings.unshift(crianaItem);
    }
  }

  return listings;
}
