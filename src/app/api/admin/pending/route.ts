import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions, getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const isDevOrTest =
      process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';
    const hasBypassHeader = request.headers.get('x-admin-bypass') === 'true';
    const isBypassAllowed = isDevOrTest && hasBypassHeader;

    if (!isBypassAllowed) {
      let session = null;
      try {
        session = await getServerSession(authOptions);
      } catch {
        // getServerSession can throw in test runners without request context
      }

      const user = await getSessionUser(request);
      const authenticated = Boolean(session?.user || user);

      if (!authenticated) {
        return NextResponse.json(
          { error: 'No autenticado. Se requiere iniciar sesión.' },
          { status: 401 }
        );
      }

      const role = session?.user?.role || user?.role;
      if (role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Acceso denegado. Se requieren permisos de administrador.' },
          { status: 403 }
        );
      }
    }

    const pendingListings = await prisma.listing.findMany({
      where: { status: 'PENDING' },
      include: {
        category: true,
        subcategory: true,
        school: true,
        schoolRequest: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            dni: true,
            schoolOfOrigin: {
              select: {
                id: true,
                nombre: true,
                localidad: true,
                departamento: true,
                jurisdiccion: true,
              },
            },
          },
        },
        images: {
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(pendingListings);
  } catch (error) {
    console.error('Error fetching pending listings for admin:', error);
    return NextResponse.json(
      { error: 'Error interno al consultar avisos pendientes' },
      { status: 500 }
    );
  }
}
