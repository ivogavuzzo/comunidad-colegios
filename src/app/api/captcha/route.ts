import { NextRequest, NextResponse } from 'next/server';
import { generateCaptcha } from '@/lib/captcha';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const challenge = generateCaptcha();

    // Check if user is logged in to return their listing count and limit status
    let userListingCount = 0;
    let limitReached = false;
    let userRole = 'USER';

    const user = await getSessionUser(request);
    if (user) {
      userRole = user.role;
      userListingCount = await prisma.listing.count({
        where: {
          userId: user.id,
          status: { not: 'REJECTED' },
        },
      });
      limitReached = userListingCount >= 10 && user.role !== 'ADMIN';
    }

    return NextResponse.json({
      ...challenge,
      userListingCount,
      maxListings: 10,
      limitReached,
      isAdmin: userRole === 'ADMIN',
    });
  } catch (error) {
    console.error('Error generating captcha challenge:', error);
    return NextResponse.json(
      { error: 'Error al generar verificación de seguridad' },
      { status: 500 }
    );
  }
}
