import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions, getSessionUser } from '@/lib/auth';

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

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await checkAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acceso denegado. Se requieren permisos de administrador.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase();
    const schoolFilter = searchParams.get('school')?.trim();
    const tagFilter = searchParams.get('tag')?.trim().toLowerCase();
    const dateFrom = searchParams.get('dateFrom')?.trim();
    const dateTo = searchParams.get('dateTo')?.trim();
    const roleFilter = searchParams.get('role')?.trim().toUpperCase();
    const statusFilter = searchParams.get('status')?.trim().toLowerCase();

    // Query all users with full relations so admin has immediate full view and counts
    const users = await prisma.user.findMany({
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
      orderBy: { createdAt: 'desc' },
    });

    // Apply filtering (works seamlessly whether requested with query params or client filtered)
    let filteredUsers = users;

    if (search) {
      filteredUsers = filteredUsers.filter((u) => {
        const nameMatch = u.name?.toLowerCase().includes(search);
        const emailMatch = u.email.toLowerCase().includes(search);
        const dniMatch = u.dni?.toLowerCase().includes(search);
        return nameMatch || emailMatch || dniMatch;
      });
    }

    if (schoolFilter) {
      const lowerSchool = schoolFilter.toLowerCase();
      filteredUsers = filteredUsers.filter((u) => {
        const originMatch =
          u.schoolOfOrigin?.id === schoolFilter ||
          u.schoolOfOrigin?.nombre.toLowerCase().includes(lowerSchool);
        const listingSchoolMatch = u.listings.some(
          (l) =>
            l.school?.id === schoolFilter ||
            l.school?.nombre.toLowerCase().includes(lowerSchool)
        );
        return originMatch || listingSchoolMatch;
      });
    }

    if (tagFilter) {
      filteredUsers = filteredUsers.filter((u) =>
        u.listings.some((l) =>
          l.tags.some(
            (t) =>
              t.tag.slug.toLowerCase().includes(tagFilter) ||
              t.tag.name.toLowerCase().includes(tagFilter)
          )
        )
      );
    }

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filteredUsers = filteredUsers.filter((u) => new Date(u.createdAt) >= fromDate);
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      // Include whole day
      toDate.setHours(23, 59, 59, 999);
      filteredUsers = filteredUsers.filter((u) => new Date(u.createdAt) <= toDate);
    }

    if (roleFilter && (roleFilter === 'ADMIN' || roleFilter === 'USER')) {
      filteredUsers = filteredUsers.filter((u) => u.role === roleFilter);
    }

    if (statusFilter === 'active') {
      filteredUsers = filteredUsers.filter((u) => u.isActive !== false);
    } else if (statusFilter === 'disabled') {
      filteredUsers = filteredUsers.filter((u) => u.isActive === false);
    }

    return NextResponse.json(filteredUsers);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json(
      { error: 'Error interno al consultar usuarios' },
      { status: 500 }
    );
  }
}
