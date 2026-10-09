import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions, getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    let session = null;
    try {
      session = await getServerSession(authOptions);
    } catch {
      // test environment without request context
    }

    const sessionUser = await getSessionUser(request);
    const currentUser = session?.user || sessionUser;

    if (!currentUser || !currentUser.id) {
      return NextResponse.json(
        { error: 'No autenticado. Por favor iniciá sesión.' },
        { status: 401 }
      );
    }

    const listings = await prisma.listing.findMany({
      where: { userId: currentUser.id },
      include: {
        category: true,
        subcategory: true,
        school: true,
        schoolRequest: true,
        images: {
          orderBy: { orderIndex: 'asc' },
        },
        _count: {
          select: {
            clicks: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(listings);
  } catch (error) {
    console.error('Error fetching user listings:', error);
    return NextResponse.json(
      { error: 'Error interno al consultar tus avisos' },
      { status: 500 }
    );
  }
}
