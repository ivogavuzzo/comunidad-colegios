import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions, getSessionUser } from '@/lib/auth';
import { slugifyTag } from '@/lib/tags';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    const group = searchParams.get('group')?.trim();

    const where: any = {};
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { slug: { contains: q } },
        { group: { contains: q } },
      ];
    }
    if (group) {
      where.group = group;
    }

    const tags = await prisma.tag.findMany({
      where,
      include: {
        _count: {
          select: {
            listings: true,
          },
        },
      },
      orderBy: [
        { group: 'asc' },
        { orderIndex: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Error interno al consultar tags' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Admin check
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
    const group = body.group?.trim() || null;
    const customSlug = body.slug?.trim();

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: 'El nombre del tag debe tener al menos 2 caracteres.' },
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
    const existing = await prisma.tag.findFirst({
      where: {
        OR: [{ name }, { slug }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Ya existe un tag con el nombre o slug "${name}".` },
        { status: 409 }
      );
    }

    const newTag = await prisma.tag.create({
      data: {
        name,
        slug,
        group,
        orderIndex: typeof body.orderIndex === 'number' ? body.orderIndex : 0,
      },
      include: {
        _count: {
          select: { listings: true },
        },
      },
    });

    return NextResponse.json(newTag, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { error: 'Error interno al crear el tag' },
      { status: 500 }
    );
  }
}
