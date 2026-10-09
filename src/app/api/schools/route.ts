import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

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

    if (queryParam && queryParam.trim()) {
      where.nombre = {
        contains: queryParam.trim(),
      };
    }

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
      take: 100,
    });

    return NextResponse.json(schools);
  } catch (error) {
    console.error('Error fetching schools:', error);
    return NextResponse.json(
      { error: 'Error interno al consultar colegios' },
      { status: 500 }
    );
  }
}
