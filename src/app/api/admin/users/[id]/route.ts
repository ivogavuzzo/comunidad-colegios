import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions, getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function getAdminActor(request: NextRequest) {
  const isDevOrTest =
    process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';
  const hasBypassHeader = request.headers.get('x-admin-bypass') === 'true';
  const isBypassAllowed = isDevOrTest && hasBypassHeader;

  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {}

  const user = await getSessionUser(request);

  if (isBypassAllowed) {
    return { isAdmin: true, actorId: user?.id || session?.user?.id || null };
  }

  const authenticated = Boolean(session?.user || user);
  if (!authenticated) return { isAdmin: false, actorId: null };

  const role = session?.user?.role || user?.role;
  return {
    isAdmin: role === 'ADMIN',
    actorId: user?.id || session?.user?.id || null,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { isAdmin } = await getAdminActor(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acceso denegado. Se requieren permisos de administrador.' },
        { status: 403 }
      );
    }

    const { id } = await Promise.resolve(params);
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        schoolOfOrigin: true,
        _count: {
          select: {
            listings: true,
          },
        },
        listings: {
          include: {
            category: true,
            subcategory: true,
            school: true,
            tags: {
              include: {
                tag: true,
              },
            },
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
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado.' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user details:', error);
    return NextResponse.json(
      { error: 'Error interno al consultar el usuario' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { isAdmin, actorId } = await getAdminActor(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acceso denegado. Se requieren permisos de administrador.' },
        { status: 403 }
      );
    }

    const { id } = await Promise.resolve(params);
    const body = await request.json();

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado.' },
        { status: 404 }
      );
    }

    const dataToUpdate: { isActive?: boolean; role?: string } = {};

    // 1. Toggle or set isActive
    if (body.isActive !== undefined) {
      if (typeof body.isActive !== 'boolean') {
        return NextResponse.json(
          { error: 'El campo isActive debe ser un booleano (true o false).' },
          { status: 400 }
        );
      }
      if (actorId && actorId === id && body.isActive === false) {
        return NextResponse.json(
          { error: 'No puedes deshabilitar tu propia cuenta de administrador.' },
          { status: 400 }
        );
      }
      dataToUpdate.isActive = body.isActive;
    }

    // 2. Change role (Admin o Familia)
    if (body.role !== undefined) {
      const normalizedRole = String(body.role).trim().toUpperCase();
      if (normalizedRole !== 'ADMIN' && normalizedRole !== 'USER') {
        return NextResponse.json(
          { error: 'Rol inválido. Los roles permitidos son ADMIN o USER (Familia).' },
          { status: 400 }
        );
      }
      if (actorId && actorId === id && normalizedRole === 'USER') {
        return NextResponse.json(
          { error: 'No puedes quitarte el rol de administrador a ti mismo.' },
          { status: 400 }
        );
      }
      dataToUpdate.role = normalizedRole;
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json(
        { error: 'No se enviaron datos válidos para actualizar.' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      include: {
        schoolOfOrigin: true,
        _count: {
          select: {
            listings: true,
          },
        },
        listings: {
          include: {
            category: true,
            subcategory: true,
            school: true,
            tags: {
              include: {
                tag: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Error interno al actualizar el usuario' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { isAdmin, actorId } = await getAdminActor(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acceso denegado. Se requieren permisos de administrador.' },
        { status: 403 }
      );
    }

    const { id } = await Promise.resolve(params);

    if (actorId && actorId === id) {
      return NextResponse.json(
        { error: 'No puedes eliminar tu propia cuenta de administrador.' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado.' },
        { status: 404 }
      );
    }

    // Cascade delete user (listings and associations cascade automatically)
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Usuario eliminado exitosamente. Podrá volver a registrarse con Google.',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Error interno al eliminar el usuario' },
      { status: 500 }
    );
  }
}
