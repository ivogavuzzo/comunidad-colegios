import crypto from 'crypto';
import { prisma } from './prisma';

export const INSTITUTIONAL_FOOTER_TEXT = 'Esta comunidad es una iniciativa de Criana';

export interface ModerationEmailPayload {
  listingId: string;
  title: string;
  description: string;
  aiCorrectedTitle?: string | null;
  aiCorrectedDesc?: string | null;
  aiModerationStatus?: string | null;
  flagReason?: string | null;
  schoolName: string;
  categoryName?: string;
  subcategoryName?: string;
  advertiserName?: string | null;
  advertiserEmail?: string | null;
  advertiserDni?: string | null;
  advertiserSchoolOfOrigin?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  webUrl?: string | null;
  approveToken: string;
  rejectToken: string;
  baseUrl?: string;
  recipientEmail?: string;
}

export interface SentEmailRecord {
  to: string;
  subject: string;
  html: string;
  text: string;
  payload: ModerationEmailPayload;
  sentAt: Date;
  mode: 'resend' | 'simulation';
}

// In-memory inspection queue for automated tests & transactional logging
const sentEmailsQueue: SentEmailRecord[] = [];

export function getSentEmails(): SentEmailRecord[] {
  return [...sentEmailsQueue];
}

export function clearSentEmails(): void {
  sentEmailsQueue.length = 0;
}

/**
 * Generate 256-bit cryptographic entropy token (64 hex characters)
 */
export function generate256BitOtpToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create dual single-use cryptographic tokens (APPROVE and REJECT)
 * with 7-day expiration (or custom expiration) linked to a Listing.
 */
export async function createListingModerationTokens(
  listingId: string,
  expirationDays = 7
): Promise<{
  approveToken: string;
  rejectToken: string;
  expiresAt: Date;
}> {
  const approveToken = generate256BitOtpToken();
  const rejectToken = generate256BitOtpToken();
  const expiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000);

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

/**
 * Build HTML email template for administrator moderation review.
 * Contains preview diff, 1-click action buttons, and mandatory Criana institutional footer.
 */
export function buildModerationEmailHtml(payload: ModerationEmailPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const baseUrl = (
    payload.baseUrl ||
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');

  const approveUrl = `${baseUrl}/api/moderation/otp?token=${payload.approveToken}`;
  const rejectUrl = `${baseUrl}/api/moderation/otp?token=${payload.rejectToken}`;

  const subject = `[Moderación Comunidades] Nuevo aviso pendiente: "${payload.title}" (${payload.schoolName})`;

  const text = `
COMUNIDADES DE COLEGIOS (by Criana) - MODERACIÓN DE AVISO

Nuevo aviso pendiente de revisión:
Título original: ${payload.title}
Título corregido por IA: ${payload.aiCorrectedTitle || payload.title}

Descripción original:
${payload.description}

Descripción corregida por IA:
${payload.aiCorrectedDesc || payload.description}

Colegio: ${payload.schoolName}
Categoría: ${payload.categoryName || 'General'} / ${payload.subcategoryName || 'General'}
Anunciante: ${payload.advertiserName || 'No indicado'} (${payload.advertiserEmail || ''})
DNI: ${payload.advertiserDni || 'No indicado'}
Colegio de Procedencia: ${payload.advertiserSchoolOfOrigin || 'No indicado'}

Canales de contacto:
- WhatsApp: ${payload.whatsapp || 'No especificado'}
- Email: ${payload.email || 'No especificado'}
- Web: ${payload.webUrl || 'No especificado'}

Acciones de moderación en 1 clic:
- APROBAR: ${approveUrl}
- RECHAZAR: ${rejectUrl}

El token OTP es de uso único: al reutilizarse devuelve un mensaje claro de estado ya procesado.

----------------------------------------
${INSTITUTIONAL_FOOTER_TEXT}
`.trim();

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #1f2937; margin: 0; padding: 20px; background-color: #f3f4f6; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .header { background-color: #1e3a8a; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
    .header p { margin: 4px 0 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 24px; }
    .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 16px; }
    .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin-bottom: 16px; }
    .card h3 { margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; color: #4b5563; }
    .diff-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px; margin-bottom: 12px; border-radius: 0 6px 6px 0; }
    .diff-title { font-weight: 600; color: #1e40af; font-size: 13px; margin-bottom: 4px; }
    .buttons-container { text-align: center; margin: 28px 0 20px 0; }
    .btn { display: inline-block; padding: 12px 28px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 6px; margin: 0 8px; cursor: pointer; }
    .btn-approve { background-color: #16a34a; color: #ffffff !important; }
    .btn-reject { background-color: #dc2626; color: #ffffff !important; }
    .security-note { font-size: 12px; color: #6b7280; text-align: center; margin-top: 12px; }
    .footer { background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 16px; text-align: center; font-size: 13px; color: #6b7280; }
    .footer-highlight { font-weight: 600; color: #374151; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Comunidades de Colegios</h1>
      <p>Panel de Moderación Rápida (1-Click OTP)</p>
    </div>

    <div class="content">
      <span class="badge">Pendiente de Aprobación</span>

      <div class="card">
        <h3>Datos del Anunciante</h3>
        <p style="margin: 4px 0;"><strong>Nombre:</strong> ${payload.advertiserName || 'No indicado'}</p>
        <p style="margin: 4px 0;"><strong>Email:</strong> ${payload.advertiserEmail || 'No indicado'}</p>
        <p style="margin: 4px 0;"><strong>DNI:</strong> ${payload.advertiserDni || 'No indicado'}</p>
        <p style="margin: 4px 0;"><strong>Colegio de procedencia:</strong> ${payload.advertiserSchoolOfOrigin || 'No indicado'}</p>
        <p style="margin: 4px 0;"><strong>Colegio del aviso:</strong> ${payload.schoolName}</p>
      </div>

      <div class="card">
        <h3>Canales de Contacto</h3>
        <p style="margin: 4px 0;"><strong>WhatsApp:</strong> ${payload.whatsapp || 'No provisto'}</p>
        <p style="margin: 4px 0;"><strong>Email:</strong> ${payload.email || 'No provisto'}</p>
        <p style="margin: 4px 0;"><strong>Sitio Web:</strong> ${payload.webUrl || 'No provisto'}</p>
      </div>

      <div class="card">
        <h3>Vista Previa y Corrección de IA (Gemini 2.5 Flash)</h3>
        
        <div class="diff-box">
          <div class="diff-title">Título Original:</div>
          <div>${payload.title}</div>
        </div>
        
        <div class="diff-box" style="background: #f0fdf4; border-left-color: #22c55e;">
          <div class="diff-title" style="color: #15803d;">Propuesta IA (Título):</div>
          <div>${payload.aiCorrectedTitle || payload.title}</div>
        </div>

        <div class="diff-box">
          <div class="diff-title">Descripción Original:</div>
          <div style="white-space: pre-wrap;">${payload.description}</div>
        </div>

        <div class="diff-box" style="background: #f0fdf4; border-left-color: #22c55e;">
          <div class="diff-title" style="color: #15803d;">Propuesta IA (Descripción):</div>
          <div style="white-space: pre-wrap;">${payload.aiCorrectedDesc || payload.description}</div>
        </div>

        ${
          payload.flagReason
            ? `<div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; border-radius: 0 6px 6px 0; margin-top: 8px;">
                 <strong style="color: #b91c1c;">Alerta de Moderación:</strong> ${payload.flagReason}
               </div>`
            : ''
        }
      </div>

      <div class="buttons-container">
        <a href="${approveUrl}" class="btn btn-approve">Aprobar</a>
        <a href="${rejectUrl}" class="btn btn-reject">Rechazar</a>
        <div class="security-note">
          Modera en 1 solo clic sin iniciar sesión. Al hacer clic, el token queda consumido y su par queda invalidado.
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-highlight">${INSTITUTIONAL_FOOTER_TEXT}</div>
      <div style="margin-top: 4px; font-size: 11px;">Aviso Legal: Plataforma comunitaria de contacto directo entre familias escolares.</div>
    </div>
  </div>
</body>
</html>
`.trim();

  return { subject, html, text };
}

/**
 * Dispatches transactional email to administrators.
 * Supports Resend if API key is configured, otherwise logs to simulation queue for testing.
 */
export async function sendAdminModerationEmail(
  payload: ModerationEmailPayload
): Promise<{
  success: boolean;
  messageId: string;
  mode: 'resend' | 'simulation';
}> {
  const adminRecipient =
    payload.recipientEmail ||
    process.env.ADMIN_MODERATION_EMAIL ||
    'moderacion@criana.com';

  const { subject, html, text } = buildModerationEmailHtml(payload);
  const resendApiKey = process.env.RESEND_API_KEY;

  if (resendApiKey && resendApiKey !== 'test-dummy-key') {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'Comunidades <no-reply@criana.com>',
          to: [adminRecipient],
          subject,
          html,
          text,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const record: SentEmailRecord = {
          to: adminRecipient,
          subject,
          html,
          text,
          payload,
          sentAt: new Date(),
          mode: 'resend',
        };
        sentEmailsQueue.push(record);
        return {
          success: true,
          messageId: data.id || `resend-${Date.now()}`,
          mode: 'resend',
        };
      }
    } catch (error) {
      console.warn('Error dispatching via Resend API, falling back to simulation:', error);
    }
  }

  // Transactional simulation mode (for development and tests)
  const messageId = `sim-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const record: SentEmailRecord = {
    to: adminRecipient,
    subject,
    html,
    text,
    payload,
    sentAt: new Date(),
    mode: 'simulation',
  };
  sentEmailsQueue.push(record);

  return {
    success: true,
    messageId,
    mode: 'simulation',
  };
}
