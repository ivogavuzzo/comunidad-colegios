import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions, getSessionUser } from '@/lib/auth';
import { slugifyTag } from '@/lib/tags';

export const dynamic = 'force-dynamic';

async function checkAdmin(request: NextRequest) {
  const isDevOrTest =
    process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';
  const hasBypassHeader = request.headers.get('x-admin-bypass') === 'true';
  const isBypassAllowed = isDevOrTest && hasBypassHeader;

  if (isBypassAllowed) return true;

  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {}

  const user = await getSessionUser(request);
  const authenticated = Boolean(session?.user || user);

  if (!authenticated) return false;

  const role = session?.user?.role || user?.role;
  return role === 'ADMIN';
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const isAdmin = await checkAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acceso denegado. Se requieren permisos de administrador.' },
        { status: 403 }
      );
    }

    const { id } = await Promise.resolve(params);
    const body = await request.json();

    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'El rubro o categoría solicitada no existe.' },
        { status: 404 }
      );
    }

    const dataToUpdate: any = {};

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (name.length < 2) {
        return NextResponse.json(
          { error: 'El nombre del rubro debe tener al menos 2 caracteres.' },
          { status: 400 }
        );
      }
      dataToUpdate.name = name;

      if (name !== existingCategory.name) {
        const nameConflict = await prisma.category.findFirst({
          where: { name, id: { not: id } },
        });
        if (nameConflict) {
          return NextResponse.json(
            { error: `Ya existe otro rubro con el nombre "${name}".` },
            { status: 409 }
          );
        }
      }
    }

    if (body.slug !== undefined) {
      const slug = slugifyTag(body.slug.trim());
      if (!slug) {
        return NextResponse.json(
          { error: 'El slug proporcionado no es válido.' },
          { status: 400 }
        );
      }
      dataToUpdate.slug = slug;

      if (slug !== existingCategory.slug) {
        const slugConflict = await prisma.category.findFirst({
          where: { slug, id: { not: id } },
        });
        if (slugConflict) {
          return NextResponse.json(
            { error: `Ya existe otro rubro con el slug "${slug}".` },
            { status: 409 }
          );
        }
      }
    } else if (body.name !== undefined && body.autoUpdateSlug) {
      dataToUpdate.slug = slugifyTag(body.name);
    }

    if (body.icon !== undefined) {
      dataToUpdate.icon = body.icon ? body.icon.trim() : null;
    }

    if (body.orderIndex !== undefined && typeof body.orderIndex === 'number') {
      dataToUpdate.orderIndex = body.orderIndex;
    }

    const updated = await prisma.category.update({
      where: { id },
      data: dataToUpdate,
      include: {
        subcategories: true,
        _count: {
          select: { listings: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Error interno al actualizar el rubro.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const isAdmin = await checkAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acceso denegado. Se requieren permisos de administrador.' },
        { status: 403 }
      );
    }

    const { id } = await Promise.resolve(params);

    const existingCategory = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { listings: true },
        },
      },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'El rubro o categoría solicitada no existe.' },
        { status: 404 }
      );
    }

    // Set categoryId to null on associated listings to prevent breaking listings
    await prisma.listing.updateMany({
      where: { categoryId: id },
      data: { categoryId: null, subcategoryId: null },
    });

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Rubro "${existingCategory.name}" eliminado exitosamente.`,
      unlinkedListingsCount: existingCategory._count.listings,
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Error interno al eliminar el rubro.' },
      { status: 500 }
    );
  }
}
