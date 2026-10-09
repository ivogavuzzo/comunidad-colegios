import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { INSTITUTIONAL_FOOTER_TEXT } from '@/lib/email';

export const dynamic = 'force-dynamic';

function renderHtmlResponse(options: {
  title: string;
  message: string;
  status: number;
  listingStatus?: string;
  action?: string;
  processedAt?: Date;
}): Response {
  const isSuccess = options.status === 200;
  const isConflict = options.status === 409;
  const accentColor = isSuccess
    ? options.action === 'APPROVE'
      ? '#16a34a'
      : '#dc2626'
    : isConflict
    ? '#d97706'
    : '#ef4444';

  const badgeText = isSuccess
    ? options.action === 'APPROVE'
      ? 'Aprobado'
      : 'Rechazado'
    : isConflict
    ? 'Ya Procesado'
    : 'Error';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title} - Comunidades de Colegios</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; color: #1f2937; margin: 0; padding: 20px; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #ffffff; max-width: 540px; width: 100%; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); overflow: hidden; border: 1px solid #e5e7eb; }
    .header { background: #1e3a8a; color: #ffffff; padding: 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 18px; font-weight: 700; }
    .content { padding: 32px 24px; text-align: center; }
    .badge { display: inline-block; background-color: ${accentColor}; color: #ffffff; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 16px; }
    .message { font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 24px; }
    .meta-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 24px; font-size: 13px; text-align: left; }
    .btn { display: inline-block; background-color: #1e3a8a; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 14px; }
    .footer { background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 16px; text-align: center; font-size: 13px; color: #6b7280; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Comunidades de Colegios (by Criana)</h1>
    </div>
    <div class="content">
      <div class="badge">${badgeText}</div>
      <h2 style="margin: 0 0 12px 0; font-size: 20px; color: #111827;">${options.title}</h2>
      <p class="message">${options.message}</p>
      ${
        options.listingStatus
          ? `<div class="meta-box">
              <div><strong>Estado de la publicación:</strong> ${options.listingStatus}</div>
              ${
                options.processedAt
                  ? `<div><strong>Fecha de procesamiento:</strong> ${options.processedAt.toISOString()}</div>`
                  : ''
              }
             </div>`
          : ''
      }
      <a href="/" class="btn">Ir al Catálogo de Colegios</a>
    </div>
    <div class="footer">
      ${INSTITUTIONAL_FOOTER_TEXT}
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: options.status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const format = searchParams.get('format');
    const acceptHeader = request.headers.get('accept') || '';
    const wantsHtml =
      format === 'html' ||
      (acceptHeader.includes('text/html') && !acceptHeader.includes('application/json'));

    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    if (!token) {
      const errorMsg = 'Token inválido o no encontrado';
      if (wantsHtml) {
        return renderHtmlResponse({
          title: 'Token no provisto',
          message: errorMsg,
          status: 404,
        });
      }
      return NextResponse.json(
        { success: false, error: errorMsg, message: errorMsg },
        { status: 404 }
      );
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const tokenRecord = await tx.moderationOtpToken.findUnique({
        where: { token },
        include: {
          listing: {
            include: {
              school: true,
              schoolRequest: true,
            },
          },
        },
      });

      if (!tokenRecord) {
        return {
          status: 404,
          success: false,
          message: 'Token inválido o no encontrado',
        };
      }

      if (tokenRecord.usedAt !== null) {
        return {
          status: 409,
          success: false,
          message:
            'El token OTP es de uso único: al reutilizarse devuelve un mensaje claro de estado ya procesado.',
          listingId: tokenRecord.listingId,
          listingStatus: tokenRecord.listing.status,
          processedAt: tokenRecord.usedAt,
        };
      }

      if (tokenRecord.expiresAt < now) {
        return {
          status: 410,
          success: false,
          message: 'El token de moderación ha expirado',
          listingId: tokenRecord.listingId,
        };
      }

      // Atomic consumption check: ensure token has not been used concurrently
      const updatedCount = await tx.moderationOtpToken.updateMany({
        where: { id: tokenRecord.id, usedAt: null },
        data: {
          usedAt: now,
          usedByIp: clientIp,
        },
      });

      if (updatedCount.count === 0) {
        return {
          status: 409,
          success: false,
          message:
            'El token OTP es de uso único: al reutilizarse devuelve un mensaje claro de estado ya procesado.',
          listingId: tokenRecord.listingId,
          listingStatus: tokenRecord.listing.status,
          processedAt: now,
        };
      }

      // Sibling token invalidation: invalidate counterpart token for this listing
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
        status: 200,
        success: true,
        message:
          tokenRecord.action === 'APPROVE'
            ? 'Publicación aprobada exitosamente'
            : 'Publicación rechazada exitosamente',
        listingId: tokenRecord.listingId,
        action: tokenRecord.action,
        listingStatus: newStatus,
        processedAt: now,
      };
    });

    if (wantsHtml) {
      return renderHtmlResponse({
        title:
          result.status === 200
            ? result.action === 'APPROVE'
              ? 'Publicación Aprobada'
              : 'Publicación Rechazada'
            : result.status === 409
            ? 'Aviso ya procesado'
            : 'Error de Moderación',
        message: result.message,
        status: result.status,
        listingStatus: result.listingStatus,
        action: result.action,
        processedAt: result.processedAt,
      });
    }

    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
        error: !result.success ? result.message : undefined,
        listingId: result.listingId,
        action: result.action,
        listingStatus: result.listingStatus,
        processedAt: result.processedAt,
      },
      { status: result.status }
    );
  } catch (error) {
    console.error('Error in moderation OTP endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno al procesar el token de moderación' },
      { status: 500 }
    );
  }
}
