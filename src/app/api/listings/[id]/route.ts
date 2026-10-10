import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions, getSessionUser, normalizeWhatsApp } from '@/lib/auth';
import { moderateContentWithGemini } from '@/lib/gemini';
import { generate256BitOtpToken, sendAdminModerationEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { id } = await Promise.resolve(params);

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        category: true,
        subcategory: true,
        school: true,
        schoolRequest: true,
        tags: {
          include: {
            tag: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            schoolOfOrigin: true,
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
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { id } = await Promise.resolve(params);

    const targetListing = await prisma.listing.findUnique({
      where: { id },
      include: {
        category: true,
        subcategory: true,
        school: true,
        user: true,
      },
    });

    if (!targetListing) {
      return NextResponse.json(
        { error: 'Aviso no encontrado' },
        { status: 404 }
      );
    }

    const isDevOrTest =
      process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';
    const hasBypassHeader = request.headers.get('x-admin-bypass') === 'true';
    const isBypassAllowed = isDevOrTest && hasBypassHeader;

    let session = null;
    try {
      session = await getServerSession(authOptions);
    } catch {}

    const sessionUser = await getSessionUser(request);
    const currentUser = session?.user || sessionUser;
    const currentUserId = currentUser?.id;
    const currentUserRole = currentUser?.role || 'USER';

    const isOwner = Boolean(currentUserId && targetListing.userId === currentUserId);
    const isAdmin = currentUserRole === 'ADMIN' || isBypassAllowed;

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Acceso denegado. Se requieren permisos de anunciante o administrador.' },
        { status: 403 }
      );
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
      tagIds,
      tags,
      workZone,
      workNeighborhood,
      schoolId,
    } = body;

    const rawTagList = tagIds !== undefined ? tagIds : tags;

    const hasContentChanges =
      title !== undefined ||
      description !== undefined ||
      whatsapp !== undefined ||
      email !== undefined ||
      webUrl !== undefined ||
      categoryId !== undefined ||
      subcategoryId !== undefined ||
      rawTagList !== undefined ||
      workZone !== undefined ||
      workNeighborhood !== undefined ||
      schoolId !== undefined;

    const updateData: any = {};

    // 1. Manejo del Switch Publicado / No Publicado
    if (status !== undefined) {
      if (isAdmin) {
        updateData.status = status;
      } else {
        // El usuario dueño solo puede alternar entre APPROVED y HIDDEN si ya fue previamente aprobado
        if (status === 'HIDDEN') {
          updateData.status = 'HIDDEN';
        } else if (status === 'APPROVED') {
          // Si el aviso está en PENDING o REJECTED, el dueño no puede auto-aprobarlo
          if (targetListing.status === 'PENDING' || targetListing.status === 'REJECTED') {
            return NextResponse.json(
              { error: 'Tu aviso está pendiente de revisión o fue rechazado por el administrador.' },
              { status: 400 }
            );
          }
          updateData.status = 'APPROVED';
        }
      }
    }

    // 2. Modificación de contenido por el usuario: Requiere volver a estado PENDING para moderación admin
    if (hasContentChanges && isOwner && !isAdmin) {
      updateData.status = 'PENDING';
      updateData.aiModerationStatus = 'PENDING';
    }

    let finalTitle = targetListing.title;
    let finalDesc = targetListing.description;

    if (title !== undefined && title.trim()) {
      finalTitle = title.trim();
      updateData.title = finalTitle;
    }
    if (description !== undefined && description.trim()) {
      finalDesc = description.trim();
      updateData.description = finalDesc;
    }

    // Si hubo cambios de texto y el usuario no es admin, ejecutamos moderación de IA
    if ((title !== undefined || description !== undefined) && !isAdmin) {
      try {
        const moderation = await moderateContentWithGemini({
          title: finalTitle,
          description: finalDesc,
        });
        updateData.aiCorrectedTitle = moderation.correctedTitle;
        updateData.aiCorrectedDesc = moderation.correctedDescription;
      } catch (err) {
        console.error('Error moderando contenido modificado:', err);
        updateData.aiCorrectedTitle = finalTitle;
        updateData.aiCorrectedDesc = finalDesc;
      }
    } else if (isAdmin) {
      if (title !== undefined && title.trim()) {
        updateData.aiCorrectedTitle = title.trim();
      }
      if (description !== undefined && description.trim()) {
        updateData.aiCorrectedDesc = description.trim();
      }
    }

    if (whatsapp !== undefined) {
      updateData.whatsapp = whatsapp ? normalizeWhatsApp(whatsapp) : null;
    }
    if (email !== undefined) {
      updateData.email = email ? email.trim().toLowerCase() : null;
    }
    if (webUrl !== undefined) {
      let normWeb = webUrl ? webUrl.trim() : null;
      if (normWeb && !/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i.test(normWeb)) {
        normWeb = `https://${normWeb}`;
      }
      updateData.webUrl = normWeb;
    }
    if (categoryId !== undefined) {
      updateData.categoryId = categoryId;
    }
    if (subcategoryId !== undefined) {
      updateData.subcategoryId = subcategoryId;
    }
    if (schoolId !== undefined) {
      updateData.schoolId = schoolId;
    }
    if (workZone !== undefined) {
      updateData.workZone = workZone;
    }
    if (workNeighborhood !== undefined) {
      updateData.workNeighborhood = workNeighborhood ? workNeighborhood.trim() : null;
    }

    // Tags update handling
    if (rawTagList !== undefined) {
      if (!Array.isArray(rawTagList) || rawTagList.length === 0 || rawTagList.length > 5) {
        return NextResponse.json(
          { error: 'Debes seleccionar entre 1 y 5 tags relacionados con tu servicio.' },
          { status: 400 }
        );
      }

      const validTags = await prisma.tag.findMany({
        where: {
          OR: [
            { id: { in: rawTagList } },
            { slug: { in: rawTagList } },
          ],
        },
      });

      if (validTags.length !== rawTagList.length) {
        return NextResponse.json(
          { error: 'Uno o más tags seleccionados no son válidos o no existen en el sistema.' },
          { status: 400 }
        );
      }

      // Update ListingTags
      await prisma.listingTag.deleteMany({
        where: { listingId: id },
      });
      await prisma.listingTag.createMany({
        data: validTags.map((t) => ({
          listingId: id,
          tagId: t.id,
        })),
      });
    }

    const updatedListing = await prisma.listing.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        subcategory: true,
        school: true,
        tags: {
          include: {
            tag: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Si el usuario modificó contenido y pasó a PENDING, emitir notificación al admin
    if (hasContentChanges && isOwner && !isAdmin) {
      try {
        const approveToken = generate256BitOtpToken();
        const rejectToken = generate256BitOtpToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await Promise.all([
          prisma.moderationOtpToken.create({
            data: {
              token: approveToken,
              listingId: updatedListing.id,
              action: 'APPROVE',
              expiresAt,
            },
          }),
          prisma.moderationOtpToken.create({
            data: {
              token: rejectToken,
              listingId: updatedListing.id,
              action: 'REJECT',
              expiresAt,
            },
          }),
        ]);

        sendAdminModerationEmail({
          listingId: updatedListing.id,
          title: updatedListing.title,
          description: updatedListing.description,
          aiCorrectedTitle: updatedListing.aiCorrectedTitle,
          aiCorrectedDesc: updatedListing.aiCorrectedDesc,
          advertiserName: targetListing.user.name || 'Usuario',
          advertiserEmail: targetListing.user.email,
          schoolName: updatedListing.school?.nombre || 'Colegio de procedencia',
          categoryName: updatedListing.category?.name || 'General',
          approveToken,
          rejectToken,
        }).catch((err) => console.error('Error enviando email a admin tras edición:', err));
      } catch (err) {
        console.error('Error generando tokens de moderación tras edición:', err);
      }
    }

    return NextResponse.json(updatedListing);
  } catch (error) {
    console.error('Error updating listing:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el aviso' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { id } = await Promise.resolve(params);

    const targetListing = await prisma.listing.findUnique({
      where: { id },
    });

    if (!targetListing) {
      return NextResponse.json(
        { error: 'Aviso no encontrado' },
        { status: 404 }
      );
    }

    const isDevOrTest =
      process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';
    const hasBypassHeader = request.headers.get('x-admin-bypass') === 'true';
    const isBypassAllowed = isDevOrTest && hasBypassHeader;

    let session = null;
    try {
      session = await getServerSession(authOptions);
    } catch {}

    const sessionUser = await getSessionUser(request);
    const currentUser = session?.user || sessionUser;
    const currentUserId = currentUser?.id;
    const currentUserRole = currentUser?.role || 'USER';

    const isOwner = Boolean(currentUserId && targetListing.userId === currentUserId);
    const isAdmin = currentUserRole === 'ADMIN' || isBypassAllowed;

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo el anunciante o un administrador pueden eliminar este aviso.' },
        { status: 403 }
      );
    }

    await prisma.listing.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Aviso eliminado correctamente',
    });
  } catch (error) {
    console.error('Error deleting listing:', error);
    return NextResponse.json(
      { error: 'Error interno al eliminar el aviso' },
      { status: 500 }
    );
  }
}
