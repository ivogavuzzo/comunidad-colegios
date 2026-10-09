import { prisma } from '../src/lib/prisma';
import { runEtl } from '../scripts/etl-schools';

export const TAXONOMY_DATA = [
  {
    name: 'Cuidado Infantil',
    slug: 'cuidado-infantil',
    icon: 'Baby',
    orderIndex: 1,
    subcategories: [
      { name: 'Niñeras y Babysitters', slug: 'nineras-babysitters', orderIndex: 1 },
      { name: 'Cuidado de Recién Nacidos', slug: 'cuidado-recien-nacidos', orderIndex: 2 },
      { name: 'Acompañamiento y Retiro Escolar', slug: 'acompanamiento-escolar', orderIndex: 3 },
      { name: 'Estimulación Temprana', slug: 'estimulacion-temprana', orderIndex: 4 },
    ],
  },
  {
    name: 'Apoyo Escolar y Clases',
    slug: 'apoyo-escolar',
    icon: 'GraduationCap',
    orderIndex: 2,
    subcategories: [
      { name: 'Primaria y Lectoescritura', slug: 'primaria-lectoescritura', orderIndex: 1 },
      { name: 'Matemática y Ciencias Exactas', slug: 'matematica-ciencias', orderIndex: 2 },
      { name: 'Idiomas', slug: 'idiomas', orderIndex: 3 },
      { name: 'Secundaria e Ingreso Universitario', slug: 'secundaria-ingreso', orderIndex: 4 },
    ],
  },
  {
    name: 'Transporte Escolar y Movilidad',
    slug: 'transporte-escolar',
    icon: 'Bus',
    orderIndex: 3,
    subcategories: [
      { name: 'Combis y Transporte Escolar Habilitado', slug: 'combis-habilitadas', orderIndex: 1 },
      { name: 'Carpooling / Pool de Familias', slug: 'carpooling', orderIndex: 2 },
      { name: 'Traslados a Actividades y Deportes', slug: 'traslados-actividades', orderIndex: 3 },
    ],
  },
  {
    name: 'Cumpleaños y Eventos Escolares',
    slug: 'cumpleanos-eventos',
    icon: 'PartyPopper',
    orderIndex: 4,
    subcategories: [
      { name: 'Animación Infantil y Magia', slug: 'animacion-magia', orderIndex: 1 },
      { name: 'Tortas, Candy Bar y Catering', slug: 'tortas-catering', orderIndex: 2 },
      { name: 'Salones y Espacios de Eventos', slug: 'salones-eventos', orderIndex: 3 },
      { name: 'Fotografía y Video', slug: 'fotografia-video', orderIndex: 4 },
    ],
  },
  {
    name: 'Uniformes, Libros y Materiales',
    slug: 'uniformes-libros',
    icon: 'Shirt',
    orderIndex: 5,
    subcategories: [
      { name: 'Uniformes Escolares Nuevos y Usados', slug: 'uniformes-escolares', orderIndex: 1 },
      { name: 'Libros de Texto y Manuales', slug: 'libros-manuales', orderIndex: 2 },
      { name: 'Mochilas y Material Didáctico', slug: 'mochilas-material', orderIndex: 3 },
    ],
  },
  {
    name: 'Salud y Psicopedagogía Infantil',
    slug: 'salud-psicopedagogia',
    icon: 'HeartPulse',
    orderIndex: 6,
    subcategories: [
      { name: 'Psicopedagogía y Técnicas de Estudio', slug: 'psicopedagogia', orderIndex: 1 },
      { name: 'Fonoaudiología Infantil', slug: 'fonoaudiologia', orderIndex: 2 },
      { name: 'Psicología Infantil y Familiar', slug: 'psicologia-infantil', orderIndex: 3 },
      { name: 'Nutrición y Pediatría', slug: 'nutricion-pediatria', orderIndex: 4 },
    ],
  },
  {
    name: 'Actividades Extracurriculares y Deportes',
    slug: 'actividades-deportes',
    icon: 'Trophy',
    orderIndex: 7,
    subcategories: [
      { name: 'Escuelitas Deportivas y Natación', slug: 'deportes-natacion', orderIndex: 1 },
      { name: 'Danza, Teatro y Expresión Artística', slug: 'danza-teatro', orderIndex: 2 },
      { name: 'Robótica, Programación y Ajedrez', slug: 'robotica-ajedrez', orderIndex: 3 },
    ],
  },
  {
    name: 'Servicios para el Hogar y Familias',
    slug: 'servicios-hogar',
    icon: 'Home',
    orderIndex: 8,
    subcategories: [
      { name: 'Viandas Escolares y Comidas Caseras', slug: 'viandas-caseras', orderIndex: 1 },
      { name: 'Organización y Limpieza', slug: 'organizacion-limpieza', orderIndex: 2 },
      { name: 'Clases de Música e Instrumentos', slug: 'musica-instrumentos', orderIndex: 3 },
    ],
  },
];

export async function seedTaxonomyAndCriana() {
  console.log('[SEED] Iniciando siembra de taxonomía cerrada (8 categorías, 28 subcategorías)...');

  for (const catData of TAXONOMY_DATA) {
    const category = await prisma.category.upsert({
      where: { slug: catData.slug },
      update: {
        name: catData.name,
        icon: catData.icon,
        orderIndex: catData.orderIndex,
      },
      create: {
        name: catData.name,
        slug: catData.slug,
        icon: catData.icon,
        orderIndex: catData.orderIndex,
      },
    });

    for (const subData of catData.subcategories) {
      await prisma.subcategory.upsert({
        where: {
          categoryId_slug: {
            categoryId: category.id,
            slug: subData.slug,
          },
        },
        update: {
          name: subData.name,
          orderIndex: subData.orderIndex,
        },
        create: {
          categoryId: category.id,
          name: subData.name,
          slug: subData.slug,
          orderIndex: subData.orderIndex,
        },
      });
    }
  }

  const categoryCount = await prisma.category.count();
  const subcategoryCount = await prisma.subcategory.count();
  console.log(`[SEED] Taxonomía sembrada: ${categoryCount} categorías, ${subcategoryCount} subcategorías.`);

  // Sembrar Usuario Oficial de Criana
  console.log('[SEED] Sembrando usuario oficial de Criana...');
  const crianaUser = await prisma.user.upsert({
    where: { email: 'hola@criana.com.ar' },
    update: {
      name: 'Criana Oficial',
      role: 'ADMIN',
      isOnboarded: true,
    },
    create: {
      id: 'criana-official-user',
      name: 'Criana Oficial',
      email: 'hola@criana.com.ar',
      role: 'ADMIN',
      isOnboarded: true,
    },
  });

  // Localizar categoría y subcategoría para Criana
  const cuidadoInfantilCat = await prisma.category.findUniqueOrThrow({
    where: { slug: 'cuidado-infantil' },
  });

  const ninerasSubcat = await prisma.subcategory.findFirstOrThrow({
    where: {
      categoryId: cuidadoInfantilCat.id,
      slug: 'nineras-babysitters',
    },
  });

  // Sembrar Perfil Permanente Destacado de Criana
  console.log('[SEED] Sembrando perfil permanente destacado de Criana...');
  const crianaListing = await prisma.listing.upsert({
    where: { id: 'criana-official-featured' },
    update: {
      title: 'Criana — Cuidado Infantil y Niñeras de Confianza',
      description:
        'Agencia boutique de selección de niñeras pedagógicas, docentes y profesionales del cuidado infantil. Promovemos la crianza acompañada y el movimiento libre. Cada candidata atraviesa un riguroso proceso de admisión con chequeo exhaustivo de antecedentes, evaluación psicológica (psicotécnico) y validación de referencias.',
      status: 'APPROVED',
      isPermanentFeatured: true,
      pinnedPosition: 1,
      userId: crianaUser.id,
      categoryId: cuidadoInfantilCat.id,
      subcategoryId: ninerasSubcat.id,
      whatsapp: '+5491178290206',
      email: 'hola@criana.com.ar',
      webUrl: 'https://www.criana.com.ar',
    },
    create: {
      id: 'criana-official-featured',
      title: 'Criana — Cuidado Infantil y Niñeras de Confianza',
      description:
        'Agencia boutique de selección de niñeras pedagógicas, docentes y profesionales del cuidado infantil. Promovemos la crianza acompañada y el movimiento libre. Cada candidata atraviesa un riguroso proceso de admisión con chequeo exhaustivo de antecedentes, evaluación psicológica (psicotécnico) y validación de referencias.',
      status: 'APPROVED',
      isPermanentFeatured: true,
      pinnedPosition: 1,
      userId: crianaUser.id,
      categoryId: cuidadoInfantilCat.id,
      subcategoryId: ninerasSubcat.id,
      whatsapp: '+5491178290206',
      email: 'hola@criana.com.ar',
      webUrl: 'https://www.criana.com.ar',
      images: {
        create: [
          {
            url: 'https://www.criana.com.ar/logo.png',
            orderIndex: 0,
          },
        ],
      },
    },
  });

  console.log(`[SEED] Perfil oficial Criana sembrado exitosamente (ID: ${crianaListing.id}).`);
}

export async function main() {
  await seedTaxonomyAndCriana();

  const schoolCount = await prisma.school.count();
  if (schoolCount === 0) {
    console.log('[SEED] Tabla School vacía. Ejecutando ETL de colegios...');
    await runEtl();
  } else {
    console.log(`[SEED] Ya existen ${schoolCount} colegios en la base de datos.`);
  }

  console.log('[SEED] Proceso de seed finalizado con éxito.');
}

if (require.main === module || process.argv[1]?.includes('seed')) {
  main()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('[SEED] Error en seed:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
