import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, sanitizeAndValidateDni } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dni, schoolOfOriginId, userId, email } = body;

    // 1. Resolve authenticated user
    let user = await getSessionUser(request);

    // Development / test fallback when request provides test identifier
    if (!user && (userId || email)) {
      user = await prisma.user.findFirst({
        where: userId ? { id: userId } : { email: email.toLowerCase() },
        include: { schoolOfOrigin: true },
      });
    }

    if (!user) {
      return NextResponse.json(
        {
          error:
            'No autorizado. Debes iniciar sesión con Google para completar el onboarding.',
        },
        { status: 401 }
      );
    }

    // 2. Validate DNI (7-8 numeric digits)
    if (!dni || typeof dni !== 'string') {
      return NextResponse.json(
        { error: 'El DNI es obligatorio y debe tener entre 7 y 8 números' },
        { status: 400 }
      );
    }

    const dniValidation = sanitizeAndValidateDni(dni);
    if (!dniValidation.isValid) {
      return NextResponse.json(
        {
          error:
            dniValidation.error ||
            'El DNI debe contener entre 7 y 8 números',
        },
        { status: 400 }
      );
    }

    // 3. Validate School of Origin
    if (!schoolOfOriginId || typeof schoolOfOriginId !== 'string' || !schoolOfOriginId.trim()) {
      return NextResponse.json(
        { error: 'El colegio de procedencia es obligatorio' },
        { status: 400 }
      );
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolOfOriginId.trim() },
    });

    if (!school) {
      return NextResponse.json(
        { error: 'El colegio de procedencia seleccionado no existe' },
        { status: 400 }
      );
    }

    // 4. Update user record to isOnboarded: true
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        dni: dniValidation.cleanDni,
        schoolOfOriginId: school.id,
        isOnboarded: true,
      },
      include: {
        schoolOfOrigin: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          dni: updatedUser.dni,
          schoolOfOriginId: updatedUser.schoolOfOriginId,
          schoolOfOrigin: updatedUser.schoolOfOrigin,
          isOnboarded: updatedUser.isOnboarded,
          role: updatedUser.role,
        },
        message: 'Onboarding completado exitosamente',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in onboarding API:', error);
    return NextResponse.json(
      { error: 'Error interno al procesar el onboarding' },
      { status: 500 }
    );
  }
}
