import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions, getSessionUser } from '@/lib/auth';
import { slugifyTag } from '@/lib/tags';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        subcategories: {
          orderBy: {
            orderIndex: 'asc',
          },
        },
        _count: {
          select: {
            listings: true,
          },
        },
      },
      orderBy: {
        orderIndex: 'asc',
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Error interno al consultar categorías' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const isDevOrTest =
      process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';
    const hasBypassHeader = request.headers.get('x-admin-bypass') === 'true';
    const isBypassAllowed = isDevOrTest && hasBypassHeader;

    if (!isBypassAllowed) {
      let session = null;
      try {
        session = await getServerSession(authOptions);
      } catch {}

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

    const body = await request.json();
    const name = body.name?.trim();
    const icon = body.icon?.trim() || 'Layers';
    const customSlug = body.slug?.trim();

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: 'El nombre del rubro debe tener al menos 2 caracteres.' },
        { status: 400 }
      );
    }

    const slug = customSlug ? slugifyTag(customSlug) : slugifyTag(name);

    if (!slug) {
      return NextResponse.json(
        { error: 'El slug generado no es válido.' },
        { status: 400 }
      );
    }

    // Check duplicate
    const existing = await prisma.category.findFirst({
      where: {
        OR: [{ name }, { slug }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Ya existe un rubro o categoría con el nombre o slug "${name}".` },
        { status: 409 }
      );
    }

    const maxOrder = await prisma.category.aggregate({
      _max: { orderIndex: true },
    });
    const nextOrder = typeof body.orderIndex === 'number'
      ? body.orderIndex
      : (maxOrder._max.orderIndex || 0) + 1;

    const newCategory = await prisma.category.create({
      data: {
        name,
        slug,
        icon,
        orderIndex: nextOrder,
      },
      include: {
        subcategories: true,
        _count: {
          select: { listings: true },
        },
      },
    });

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Error interno al crear el rubro' },
      { status: 500 }
    );
  }
}
