import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      nombre,
      jurisdiccion,
      departamento,
      localidad,
      domicilio,
      userEmail,
      userName,
    } = body;

    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return NextResponse.json(
        { error: 'El nombre del colegio es obligatorio' },
        { status: 400 }
      );
    }

    if (!jurisdiccion || typeof jurisdiccion !== 'string' || !jurisdiccion.trim()) {
      return NextResponse.json(
        { error: 'La jurisdicción (CABA o GBA) es obligatoria' },
        { status: 400 }
      );
    }

    const normJurisdiccion = jurisdiccion.trim().toUpperCase();
    if (normJurisdiccion !== 'CABA' && normJurisdiccion !== 'GBA') {
      return NextResponse.json(
        { error: 'La jurisdicción debe ser CABA o GBA' },
        { status: 400 }
      );
    }

    if (!departamento || typeof departamento !== 'string' || !departamento.trim()) {
      return NextResponse.json(
        { error: 'El departamento (Comuna o Partido) es obligatorio' },
        { status: 400 }
      );
    }

    if (!localidad || typeof localidad !== 'string' || !localidad.trim()) {
      return NextResponse.json(
        { error: 'La localidad es obligatoria' },
        { status: 400 }
      );
    }

    if (!domicilio || typeof domicilio !== 'string' || !domicilio.trim()) {
      return NextResponse.json(
        { error: 'La dirección física (domicilio) es obligatoria' },
        { status: 400 }
      );
    }

    const schoolRequest = await prisma.schoolRequest.create({
      data: {
        nombre: nombre.trim(),
        jurisdiccion: normJurisdiccion,
        departamento: departamento.trim(),
        localidad: localidad.trim(),
        domicilio: domicilio.trim(),
        status: 'PENDING',
        userEmail: userEmail && typeof userEmail === 'string' ? userEmail.trim() : null,
        userName: userName && typeof userName === 'string' ? userName.trim() : null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        request: schoolRequest,
        message: 'Solicitud de colegio creada con éxito en estado PENDING',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating school request:', error);
    return NextResponse.json(
      { error: 'Error interno al registrar la solicitud de colegio' },
      { status: 500 }
    );
  }
}
