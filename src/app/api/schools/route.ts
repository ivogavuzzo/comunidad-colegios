import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { mergeDuplicateSchools } from '@/lib/schools';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jurisdiccionParam = searchParams.get('jurisdiccion');
    const departamentoParam = searchParams.get('departamento');
    const queryParam = searchParams.get('q') || searchParams.get('query');
    const modeParam = searchParams.get('mode');

    // Support querying list of distinct departamentos
    if (modeParam === 'departamentos') {
      const whereClause: Prisma.SchoolWhereInput = {};
      if (jurisdiccionParam) {
        whereClause.jurisdiccion = jurisdiccionParam.toUpperCase();
      }
      const records = await prisma.school.groupBy({
        by: ['departamento'],
        where: whereClause,
      });
      const departamentos = records.map((r) => r.departamento).sort();
      return NextResponse.json(departamentos);
    }

    const where: Prisma.SchoolWhereInput = {};

    if (jurisdiccionParam) {
      where.jurisdiccion = jurisdiccionParam.toUpperCase();
    }

    if (departamentoParam) {
      where.departamento = departamentoParam;
    }

    const idParam = searchParams.get('id');
    if (idParam) {
      const targetSchool = await prisma.school.findUnique({
        where: { id: idParam },
        select: {
          id: true,
          cueanexo: true,
          nombre: true,
          domicilio: true,
          localidad: true,
          departamento: true,
          jurisdiccion: true,
        },
      });
      if (!targetSchool) {
        return NextResponse.json([]);
      }
      const mergeParam = searchParams.get('merge');
      if (mergeParam === 'true') {
        const candidates = await prisma.school.findMany({
          where: {
            jurisdiccion: targetSchool.jurisdiccion,
            nombre: targetSchool.nombre,
          },
          select: {
            id: true,
            cueanexo: true,
            nombre: true,
            domicilio: true,
            localidad: true,
            departamento: true,
            jurisdiccion: true,
          },
        });
        const merged = mergeDuplicateSchools(candidates.length > 0 ? candidates : [targetSchool]);
        return NextResponse.json(merged);
      }
      return NextResponse.json([targetSchool]);
    }

    if (queryParam && queryParam.trim()) {
      const searchWords = queryParam
        .replace(/[.,\-_()[\]"']/g, ' ')
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0);

      if (searchWords.length === 1) {
        where.nombre = {
          contains: searchWords[0],
        };
      } else if (searchWords.length > 1) {
        where.AND = searchWords.map((word) => ({
          nombre: {
            contains: word,
          },
        }));
      }
    }

    const limitParam = searchParams.get('limit');
    const take = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 100, 1), 100) : 100;

    const schools = await prisma.school.findMany({
      where,
      select: {
        id: true,
        cueanexo: true,
        nombre: true,
        domicilio: true,
        localidad: true,
        departamento: true,
        jurisdiccion: true,
      },
      orderBy: {
        nombre: 'asc',
      },
      take,
    });

    const mergeParam = searchParams.get('merge');
    if (mergeParam === 'true') {
      return NextResponse.json(mergeDuplicateSchools(schools));
    }

    return NextResponse.json(schools);
  } catch (error) {
    console.error('Error fetching schools:', error);
    return NextResponse.json(
      { error: 'Error interno al consultar colegios' },
      { status: 500 }
    );
  }
}
