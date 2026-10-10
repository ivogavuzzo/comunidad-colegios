import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions, getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Bypass gating: Allow ONLY when NODE_ENV === 'test' || NODE_ENV === 'development'
    const isDevOrTest =
      process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';
    const hasBypassHeader = request.headers.get('x-admin-bypass') === 'true';
    const isBypassAllowed = isDevOrTest && hasBypassHeader;

    if (!isBypassAllowed) {
      let session = null;
      try {
        session = await getServerSession(authOptions);
      } catch {
        // getServerSession can throw in test runners without request context
      }

      // Check session or mock test header session resolution via getSessionUser
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

    const [
      totalListings,
      approvedListings,
      pendingListings,
      rejectedListings,
      totalClicks,
      whatsappClicks,
      emailClicks,
      webClicks,
      clicks,
      pendingItems,
      allRecentListings,
    ] = await Promise.all([
      prisma.listing.count(),
      prisma.listing.count({ where: { status: 'APPROVED' } }),
      prisma.listing.count({ where: { status: 'PENDING' } }),
      prisma.listing.count({ where: { status: 'REJECTED' } }),
      prisma.contactClick.count(),
      prisma.contactClick.count({ where: { channel: 'WHATSAPP' } }),
      prisma.contactClick.count({ where: { channel: 'EMAIL' } }),
      prisma.contactClick.count({ where: { channel: 'WEB' } }),
      prisma.contactClick.findMany({
        select: {
          createdAt: true,
          channel: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.listing.findMany({
        where: { status: 'PENDING' },
        select: {
          id: true,
          title: true,
          createdAt: true,
          workZone: true,
          workNeighborhood: true,
          category: { select: { name: true } },
          tags: { select: { tag: { select: { name: true, slug: true } } } },
          school: { select: { nombre: true } },
          schoolRequest: { select: { nombre: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.listing.findMany({
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          workZone: true,
          workNeighborhood: true,
          category: { select: { name: true } },
          tags: { select: { tag: { select: { name: true, slug: true } } } },
          school: { select: { nombre: true } },
          schoolRequest: { select: { nombre: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    // Group clicks by month (YYYY-MM)
    const clicksByMonthMap: Record<string, { total: number; whatsapp: number; email: number; web: number }> = {};
    for (const c of clicks) {
      const yearMonth = c.createdAt.toISOString().substring(0, 7);
      if (!clicksByMonthMap[yearMonth]) {
        clicksByMonthMap[yearMonth] = { total: 0, whatsapp: 0, email: 0, web: 0 };
      }
      clicksByMonthMap[yearMonth].total += 1;
      if (c.channel === 'WHATSAPP') clicksByMonthMap[yearMonth].whatsapp += 1;
      else if (c.channel === 'EMAIL') clicksByMonthMap[yearMonth].email += 1;
      else if (c.channel === 'WEB') clicksByMonthMap[yearMonth].web += 1;
    }

    const clicksByMonth = Object.entries(clicksByMonthMap).map(([month, data]) => ({
      month,
      clicks: data.total,
      whatsapp: data.whatsapp,
      email: data.email,
      web: data.web,
    }));

    const moderationQueue = pendingItems.map((item) => {
      const tagNames = item.tags.map((t) => t.tag.name).join(', ');
      return {
        id: item.id,
        title: item.title,
        category: tagNames || item.category?.name || 'General',
        tags: item.tags.map((t) => t.tag.name),
        workZone: item.workZone,
        workNeighborhood: item.workNeighborhood,
        school: item.school?.nombre || item.schoolRequest?.nombre || 'Colegio no especificado',
        date: item.createdAt.toISOString().substring(0, 10),
      };
    });

    const allListings = allRecentListings.map((item) => {
      const tagNames = item.tags.map((t) => t.tag.name).join(', ');
      return {
        id: item.id,
        title: item.title,
        status: item.status,
        category: tagNames || item.category?.name || 'General',
        tags: item.tags.map((t) => t.tag.name),
        workZone: item.workZone,
        workNeighborhood: item.workNeighborhood,
        school: item.school?.nombre || item.schoolRequest?.nombre || 'Colegio no especificado',
        date: item.createdAt.toISOString().substring(0, 10),
      };
    });

    return NextResponse.json({
      summary: {
        totalListings,
        approvedListings,
        pendingListings,
        rejectedListings,
        totalClicks,
      },
      clicksByChannel: {
        whatsapp: whatsappClicks,
        email: emailClicks,
        web: webClicks,
      },
      clicksByMonth,
      pendingListings: moderationQueue,
      moderationQueue,
      allListings,
    });
  } catch (error) {
    console.error('Error fetching admin metrics:', error);
    return NextResponse.json(
      { error: 'Error interno al consultar las métricas administrativas' },
      { status: 500 }
    );
  }
}
