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

    const existingTag = await prisma.tag.findUnique({
      where: { id },
    });

    if (!existingTag) {
      return NextResponse.json(
        { error: 'El tag solicitado no existe.' },
        { status: 404 }
      );
    }

    const dataToUpdate: any = {};

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (name.length < 2) {
        return NextResponse.json(
          { error: 'El nombre del tag debe tener al menos 2 caracteres.' },
          { status: 400 }
        );
      }
      dataToUpdate.name = name;

      // Check name uniqueness if changed
      if (name !== existingTag.name) {
        const nameConflict = await prisma.tag.findFirst({
          where: { name, id: { not: id } },
        });
        if (nameConflict) {
          return NextResponse.json(
            { error: `Ya existe otro tag con el nombre "${name}".` },
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

      if (slug !== existingTag.slug) {
        const slugConflict = await prisma.tag.findFirst({
          where: { slug, id: { not: id } },
        });
        if (slugConflict) {
          return NextResponse.json(
            { error: `Ya existe otro tag con el slug "${slug}".` },
            { status: 409 }
          );
        }
      }
    } else if (body.name !== undefined && body.autoUpdateSlug) {
      dataToUpdate.slug = slugifyTag(body.name);
    }

    if (body.group !== undefined) {
      dataToUpdate.group = body.group ? body.group.trim() : null;
    }

    if (body.orderIndex !== undefined && typeof body.orderIndex === 'number') {
      dataToUpdate.orderIndex = body.orderIndex;
    }

    const updatedTag = await prisma.tag.update({
      where: { id },
      data: dataToUpdate,
      include: {
        _count: {
          select: { listings: true },
        },
      },
    });

    return NextResponse.json(updatedTag);
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json(
      { error: 'Error interno al actualizar el tag.' },
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

    const existingTag = await prisma.tag.findUnique({
      where: { id },
      include: {
        _count: {
          select: { listings: true },
        },
      },
    });

    if (!existingTag) {
      return NextResponse.json(
        { error: 'El tag solicitado no existe.' },
        { status: 404 }
      );
    }

    await prisma.tag.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Tag "${existingTag.name}" eliminado exitosamente.`,
      unlinkedListingsCount: existingTag._count.listings,
    });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json(
      { error: 'Error interno al eliminar el tag.' },
      { status: 500 }
    );
  }
}
