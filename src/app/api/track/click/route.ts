import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function hashClientIp(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { listingId, channel } = body;

    if (!listingId || typeof listingId !== 'string') {
      return NextResponse.json(
        { error: 'listingId es obligatorio' },
        { status: 400 }
      );
    }

    const validChannels = ['WHATSAPP', 'EMAIL', 'WEB', 'WEBSITE_IG'];
    const normalizedChannel =
      typeof channel === 'string' ? channel.toUpperCase() : '';

    if (!validChannels.includes(normalizedChannel)) {
      return NextResponse.json(
        { error: 'Canal inválido. Debe ser WHATSAPP, EMAIL o WEB' },
        { status: 400 }
      );
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return NextResponse.json(
        { error: 'La publicación especificada no existe' },
        { status: 404 }
      );
    }

    const rawIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || undefined;
    const ipHash = hashClientIp(rawIp);

    const savedChannel =
      normalizedChannel === 'WEBSITE_IG' ? 'WEB' : normalizedChannel;

    const event = await prisma.contactClick.create({
      data: {
        listingId,
        channel: savedChannel,
        ipHash,
        userAgent: userAgent ? userAgent.substring(0, 500) : null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        eventId: event.id,
        channel: savedChannel,
        trackedAt: event.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error tracking contact click:', error);
    return NextResponse.json(
      { error: 'Error interno al registrar el evento de clic' },
      { status: 500 }
    );
  }
}
