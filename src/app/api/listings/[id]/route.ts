import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions, getSessionUser, normalizeWhatsApp } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const listing = await prisma.listing.findUnique({
      where: { id },
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
            image: true,
          },
        },
        images: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!listing) {
      return NextResponse.json(
        { error: 'Aviso no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(listing);
  } catch (error) {
    console.error('Error fetching listing detail:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check Admin authorization
    const isDevOrTest =
      process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';
    const hasBypassHeader = request.headers.get('x-admin-bypass') === 'true';
    const isBypassAllowed = isDevOrTest && hasBypassHeader;

    let userRole = 'USER';

    if (!isBypassAllowed) {
      let session = null;
      try {
        session = await getServerSession(authOptions);
      } catch {}

      const user = await getSessionUser(request);
      userRole = session?.user?.role || user?.role || 'USER';

      if (userRole !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Acceso denegado. Se requieren permisos de administrador.' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const {
      status, // "APPROVED" | "HIDDEN" | "PENDING" | "REJECTED"
      title,
      description,
      whatsapp,
      email,
      webUrl,
      categoryId,
      subcategoryId,
    } = body;

    const updateData: any = {};

    if (status !== undefined) {
      updateData.status = status;
    }
    if (title !== undefined && title.trim()) {
      updateData.title = title.trim();
      updateData.aiCorrectedTitle = title.trim();
    }
    if (description !== undefined && description.trim()) {
      updateData.description = description.trim();
      updateData.aiCorrectedDesc = description.trim();
    }
    if (whatsapp !== undefined) {
      updateData.whatsapp = whatsapp ? normalizeWhatsApp(whatsapp) : null;
    }
    if (email !== undefined) {
      updateData.email = email ? email.trim().toLowerCase() : null;
    }
    if (webUrl !== undefined) {
      updateData.webUrl = webUrl ? webUrl.trim() : null;
    }
    if (categoryId !== undefined) {
      updateData.categoryId = categoryId;
    }
    if (subcategoryId !== undefined) {
      updateData.subcategoryId = subcategoryId;
    }

    const updatedListing = await prisma.listing.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        subcategory: true,
        school: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(updatedListing);
  } catch (error) {
    console.error('Error updating listing:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el aviso' },
      { status: 500 }
    );
  }
}
