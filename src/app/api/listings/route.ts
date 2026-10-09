import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
  getSessionUser,
  validateListingPayload,
  normalizeWhatsApp,
} from '@/lib/auth';
import { moderateContentWithGemini } from '@/lib/gemini';
import {
  generate256BitOtpToken,
  sendAdminModerationEmail,
} from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const categoryParam = searchParams.get('categoryId');
    const subcategoryParam = searchParams.get('subcategoryId');

    let resolvedCategory = null;
    if (categoryParam) {
      resolvedCategory = await prisma.category.findFirst({
        where: {
          OR: [{ id: categoryParam }, { slug: categoryParam }],
        },
      });
    }

    let resolvedSubcategoryId: string | undefined = undefined;
    if (subcategoryParam) {
      const subcategory = await prisma.subcategory.findFirst({
        where: {
          OR: [{ id: subcategoryParam }, { slug: subcategoryParam }],
        },
      });
      if (subcategory) {
        resolvedSubcategoryId = subcategory.id;
      }
    }

    const isChildcare = resolvedCategory
      ? resolvedCategory.slug === 'cuidado-infantil'
      : true; // When all listings are viewed without category filter, isChildcare flag applies for Criana pinning

    const where: Prisma.ListingWhereInput = {
      status: 'APPROVED',
    };

    if (resolvedCategory) {
      where.categoryId = resolvedCategory.id;
    }

    if (resolvedSubcategoryId) {
      where.subcategoryId = resolvedSubcategoryId;
    }

    if (schoolId) {
      where.OR = [
        { schoolId: schoolId },
        { isPermanentFeatured: true },
        { id: 'criana-official-featured' },
      ];
    }

    let listings = await prisma.listing.findMany({
      where,
      include: {
        category: true,
        subcategory: true,
        school: true,
        images: {
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: [
        { isPermanentFeatured: 'desc' },
        { pinnedPosition: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Pinned Criana guarantee for Cuidado Infantil or when viewing all categories
    if (isChildcare) {
      const crianaIndex = listings.findIndex(
        (l) => l.id === 'criana-official-featured' || l.isPermanentFeatured
      );

      if (crianaIndex > 0) {
        const [crianaItem] = listings.splice(crianaIndex, 1);
        listings.unshift(crianaItem);
      } else if (crianaIndex === -1) {
        const criana = await prisma.listing.findUnique({
          where: { id: 'criana-official-featured' },
          include: {
            category: true,
            subcategory: true,
            school: true,
            images: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        });
        if (criana && criana.status === 'APPROVED') {
          listings.unshift(criana);
        }
      }
    }

    return NextResponse.json(listings);
  } catch (error) {
    console.error('Error fetching listings:', error);
    return NextResponse.json(
      { error: 'Error interno al consultar publicaciones' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      categoryId,
      subcategoryId,
      schoolId,
      schoolRequestId,
      whatsapp,
      email,
      webUrl,
      images,
      userId,
      userEmail,
    } = body;

    // 1. Resolve user session
    let user = await getSessionUser(request);

    // Development / automated test fallback
    if (!user && (userId || userEmail)) {
      user = await prisma.user.findFirst({
        where: userId ? { id: userId } : { email: userEmail.toLowerCase() },
        include: { schoolOfOrigin: true },
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado. Debes iniciar sesión para publicar un aviso.' },
        { status: 401 }
      );
    }

    // 2. Mandatory Onboarding Gate: isOnboarded must be true
    if (!user.isOnboarded) {
      return NextResponse.json(
        {
          error: 'Debes completar el onboarding obligatorio antes de publicar.',
          redirectUrl: '/onboarding',
        },
        { status: 403 }
      );
    }

    // 3. Validate Listing Payload
    const validation = validateListingPayload({
      title,
      description,
      categoryId,
      subcategoryId,
      schoolId,
      schoolRequestId,
      whatsapp,
      email,
      webUrl,
      images,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: validation.errors[0],
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    // 4. Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      return NextResponse.json(
        { error: 'La categoría seleccionada no existe' },
        { status: 400 }
      );
    }

    // 5. Verify subcategory exists and belongs to category
    const subcategory = await prisma.subcategory.findFirst({
      where: { id: subcategoryId, categoryId },
    });
    if (!subcategory) {
      return NextResponse.json(
        { error: 'La subcategoría seleccionada no pertenece a la categoría elegida' },
        { status: 400 }
      );
    }

    // 6. Verify school or school request exists
    if (schoolId) {
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
      });
      if (!school) {
        return NextResponse.json(
          { error: 'El colegio seleccionado no existe' },
          { status: 400 }
        );
      }
    } else if (schoolRequestId) {
      const schoolReq = await prisma.schoolRequest.findUnique({
        where: { id: schoolRequestId },
      });
      if (!schoolReq) {
        return NextResponse.json(
          { error: 'La solicitud de colegio indicada no existe' },
          { status: 400 }
        );
      }
    }

    // 7. Normalize channels
    const normalizedWhatsapp = whatsapp ? normalizeWhatsApp(whatsapp) : null;
    const cleanEmail = email && typeof email === 'string' ? email.trim() : null;
    const cleanWebUrl = webUrl && typeof webUrl === 'string' ? webUrl.trim() : null;

    // 8. Prepare images and run AI orthotypographic and grammatical moderation pipeline
    const rawImages: Array<string | { url: string; orderIndex?: number }> = Array.isArray(images)
      ? images.slice(0, 5)
      : [];

    const moderation = await moderateContentWithGemini({
      title: title.trim(),
      description: description.trim(),
    });

    // Generate two 256-bit entropy cryptographic OTP tokens (APPROVE & REJECT) with 7-day expiration
    const approveToken = generate256BitOtpToken();
    const rejectToken = generate256BitOtpToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const newListing = await prisma.listing.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        aiCorrectedTitle: moderation.correctedTitle,
        aiCorrectedDesc: moderation.correctedDescription,
        aiModerationStatus: moderation.flagged ? 'FLAGGED' : 'PENDING',
        status: 'PENDING',
        userId: user.id,
        categoryId: category.id,
        subcategoryId: subcategory.id,
        schoolId: schoolId || null,
        schoolRequestId: schoolRequestId || null,
        whatsapp: normalizedWhatsapp,
        email: cleanEmail,
        webUrl: cleanWebUrl,
        images: rawImages.length > 0 ? {
          create: rawImages.map((img, idx) => ({
            url: typeof img === 'string' ? img.trim() : img.url.trim(),
            orderIndex:
              typeof img === 'object' && typeof img.orderIndex === 'number'
                ? img.orderIndex
                : idx,
          })),
        } : undefined,
        moderationTokens: {
          create: [
            {
              token: approveToken,
              action: 'APPROVE',
              expiresAt,
            },
            {
              token: rejectToken,
              action: 'REJECT',
              expiresAt,
            },
          ],
        },
      },
      include: {
        category: true,
        subcategory: true,
        school: true,
        schoolRequest: true,
        images: {
          orderBy: { orderIndex: 'asc' },
        },
        moderationTokens: true,
      },
    });

    // 9. Dispatch transactional admin notification email
    try {
      const schoolName =
        newListing.school?.nombre ||
        newListing.schoolRequest?.nombre ||
        'Colegio general';

      const baseUrl =
        request.nextUrl?.origin ||
        process.env.NEXTAUTH_URL ||
        'http://localhost:3000';

      const userWithSchool =
        (user as any).schoolOfOrigin
          ? user
          : await prisma.user.findUnique({
              where: { id: user.id },
              include: { schoolOfOrigin: true },
            });

      await sendAdminModerationEmail({
        listingId: newListing.id,
        title: newListing.title,
        description: newListing.description,
        aiCorrectedTitle: newListing.aiCorrectedTitle,
        aiCorrectedDesc: newListing.aiCorrectedDesc,
        aiModerationStatus: newListing.aiModerationStatus,
        flagReason: moderation.flagReason,
        schoolName,
        categoryName: newListing.category?.name,
        subcategoryName: newListing.subcategory?.name,
        advertiserName: userWithSchool?.name || user.name,
        advertiserEmail: userWithSchool?.email || user.email,
        advertiserDni: userWithSchool?.dni || user.dni,
        advertiserSchoolOfOrigin: (userWithSchool as any)?.schoolOfOrigin?.nombre || null,
        whatsapp: newListing.whatsapp,
        email: newListing.email,
        webUrl: newListing.webUrl,
        approveToken,
        rejectToken,
        baseUrl,
      });
    } catch (mailErr) {
      console.warn('Error dispatching admin moderation email (non-fatal):', mailErr);
    }

    return NextResponse.json(
      {
        success: true,
        listing: newListing,
        message: 'Aviso creado con éxito en estado PENDING para moderación.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating listing:', error);
    return NextResponse.json(
      { error: 'Error interno al registrar la publicación' },
      { status: 500 }
    );
  }
}
