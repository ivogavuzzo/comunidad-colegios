export interface TagData {
  name: string;
  slug: string;
  group: string;
  orderIndex?: number;
}

export const WORK_ZONE_OPTIONS = [
  { id: 'TODO_EL_PAIS', label: 'En todo el país' },
  { id: 'TODO_AMBA', label: 'En todo AMBA' },
  { id: 'TODO_CABA', label: 'En todo CABA' },
  { id: 'BARRIO', label: 'Elegir barrio' },
] as const;

export type WorkZoneId = (typeof WORK_ZONE_OPTIONS)[number]['id'];

export const POPULAR_BARRIOS = [
  // CABA
  'Agronomía',
  'Almagro',
  'Balvanera',
  'Barracas',
  'Belgrano',
  'Boedo',
  'Caballito',
  'Chacarita',
  'Coghlan',
  'Colegiales',
  'Constitución',
  'Flores',
  'Floresta',
  'La Boca',
  'Liniers',
  'Mataderos',
  'Monte Castro',
  'Montserrat',
  'Nueva Pompeya',
  'Núñez',
  'Palermo',
  'Parque Avellaneda',
  'Parque Chacabuco',
  'Parque Chas',
  'Parque Patricios',
  'Paternal',
  'Puerto Madero',
  'Recoleta',
  'Retiro',
  'Saavedra',
  'San Cristóbal',
  'San Nicolás',
  'San Telmo',
  'Vélez Sársfield',
  'Versalles',
  'Villa Crespo',
  'Villa del Parque',
  'Villa Devoto',
  'Villa General Mitre',
  'Villa Lugano',
  'Villa Luro',
  'Villa Ortúzar',
  'Villa Pueyrredón',
  'Villa Real',
  'Villa Riachuelo',
  'Villa Santa Rita',
  'Villa Soldati',
  'Villa Urquiza',
  // Zona Norte GBA
  'Vicente López',
  'Olivos',
  'La Lucila',
  'Martínez',
  'Acassuso',
  'San Isidro',
  'Béccar',
  'Victoria',
  'San Fernando',
  'Tigre',
  'Nordelta',
  'Pilar',
  'Escobar',
  'San Martín',
  // Zona Oeste GBA
  'Morón',
  'Castelar',
  'Ramos Mejía',
  'Haedo',
  'Ituzaingó',
  'Hurlingham',
  'Tres de Febrero',
  // Zona Sur GBA
  'Avellaneda',
  'Bernal',
  'Quilmes',
  'Lanús',
  'Lomas de Zamora',
  'Banfield',
  'Temperley',
  'Adrogué',
];

export function slugifyTag(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function formatWorkZoneDisplay(
  workZone?: string | null,
  workNeighborhood?: string | null
): string | null {
  if (!workZone) return null;
  switch (workZone) {
    case 'TODO_EL_PAIS':
    case 'en todo el país':
      return 'En todo el país';
    case 'TODO_AMBA':
    case 'en todo amba':
    case 'en todo AMBA':
      return 'En todo AMBA';
    case 'TODO_CABA':
    case 'en todo CABA':
    case 'en todo caba':
      return 'En todo CABA';
    case 'BARRIO':
    case 'eligiendo barrio':
      return workNeighborhood ? `Barrio ${workNeighborhood}` : 'Barrio específico';
    default:
      return workNeighborhood ? `${workZone} - ${workNeighborhood}` : workZone;
  }
}

export const INITIAL_TAGS: TagData[] = [
  // Cuidado y Primera Infancia
  { name: 'Niñeras', slug: 'nineras', group: 'Cuidado Infantil', orderIndex: 1 },
  { name: 'Babysitters', slug: 'babysitters', group: 'Cuidado Infantil', orderIndex: 2 },
  { name: 'Cuidado de Recién Nacidos', slug: 'cuidado-recien-nacidos', group: 'Cuidado Infantil', orderIndex: 3 },
  { name: 'Acompañamiento Escolar', slug: 'acompanamiento-escolar', group: 'Cuidado Infantil', orderIndex: 4 },
  { name: 'Retiro de Colegios', slug: 'retiro-colegios', group: 'Cuidado Infantil', orderIndex: 5 },
  { name: 'Estimulación Temprana', slug: 'estimulacion-temprana', group: 'Cuidado Infantil', orderIndex: 6 },
  { name: 'Acompañante Terapéutico Escolar', slug: 'acompanante-terapeutico-escolar', group: 'Cuidado Infantil', orderIndex: 7 },

  // Apoyo Escolar y Docencia
  { name: 'Apoyo Escolar Primaria', slug: 'apoyo-primaria', group: 'Apoyo Escolar', orderIndex: 10 },
  { name: 'Apoyo Escolar Secundaria', slug: 'apoyo-secundaria', group: 'Apoyo Escolar', orderIndex: 11 },
  { name: 'Lectoescritura y Alfabetización', slug: 'lectoescritura', group: 'Apoyo Escolar', orderIndex: 12 },
  { name: 'Profesor/a de Matemática', slug: 'profesor-matematica', group: 'Apoyo Escolar', orderIndex: 13 },
  { name: 'Profesor/a de Física y Química', slug: 'profesor-fisica-quimica', group: 'Apoyo Escolar', orderIndex: 14 },
  { name: 'Profesor/a de Biología y Cs. Naturales', slug: 'profesor-biologia', group: 'Apoyo Escolar', orderIndex: 15 },
  { name: 'Profesor/a de Historia y Cs. Sociales', slug: 'profesor-historia-sociales', group: 'Apoyo Escolar', orderIndex: 16 },
  { name: 'Ingreso Universitario y CBC', slug: 'ingreso-universitario-cbc', group: 'Apoyo Escolar', orderIndex: 17 },
  { name: 'Técnicas de Estudio', slug: 'tecnicas-de-estudio', group: 'Apoyo Escolar', orderIndex: 18 },

  // Idiomas
  { name: 'Clases de Inglés', slug: 'clases-ingles', group: 'Idiomas', orderIndex: 20 },
  { name: 'Clases de Francés', slug: 'clases-frances', group: 'Idiomas', orderIndex: 21 },
  { name: 'Clases de Portugués', slug: 'clases-portugues', group: 'Idiomas', orderIndex: 22 },
  { name: 'Clases de Italiano', slug: 'clases-italiano', group: 'Idiomas', orderIndex: 23 },
  { name: 'Clases de Alemán', slug: 'clases-aleman', group: 'Idiomas', orderIndex: 24 },
  { name: 'Preparación Exámenes Internacionales', slug: 'examenes-internacionales', group: 'Idiomas', orderIndex: 25 },

  // Transporte y Movilidad
  { name: 'Transporte Escolar Habilitado', slug: 'transporte-escolar', group: 'Transporte', orderIndex: 30 },
  { name: 'Combis Escolares', slug: 'combis-escolares', group: 'Transporte', orderIndex: 31 },
  { name: 'Carpooling / Pool de Familias', slug: 'carpooling', group: 'Transporte', orderIndex: 32 },
  { name: 'Traslados a Actividades y Deportes', slug: 'traslados-actividades', group: 'Transporte', orderIndex: 33 },

  // Cumpleaños y Eventos
  { name: 'Animación Infantil', slug: 'animacion-infantil', group: 'Cumpleaños y Eventos', orderIndex: 40 },
  { name: 'Magos e Ilusionismo', slug: 'magos-ilusionismo', group: 'Cumpleaños y Eventos', orderIndex: 41 },
  { name: 'Títeres y Shows Infantiles', slug: 'titeres-shows', group: 'Cumpleaños y Eventos', orderIndex: 42 },
  { name: 'Maquillaje Artístico y Glitters', slug: 'maquillaje-artistico', group: 'Cumpleaños y Eventos', orderIndex: 43 },
  { name: 'Tortas y Pastelería Creativa', slug: 'tortas-pasteleria', group: 'Cumpleaños y Eventos', orderIndex: 44 },
  { name: 'Candy Bar y Mesas Dulces', slug: 'candy-bar', group: 'Cumpleaños y Eventos', orderIndex: 45 },
  { name: 'Catering para Eventos Infantiles', slug: 'catering-eventos', group: 'Cumpleaños y Eventos', orderIndex: 46 },
  { name: 'Salones y Espacios de Fiestas', slug: 'salones-eventos', group: 'Cumpleaños y Eventos', orderIndex: 47 },
  { name: 'Inflables y Juegos Infantiles', slug: 'inflables-juegos', group: 'Cumpleaños y Eventos', orderIndex: 48 },
  { name: 'Fotografía Infantil y Familiar', slug: 'fotografia-infantil', group: 'Cumpleaños y Eventos', orderIndex: 49 },
  { name: 'Video y Filmación', slug: 'video-filmacion', group: 'Cumpleaños y Eventos', orderIndex: 50 },
  { name: 'Souvenirs y Cotillón Personalizado', slug: 'souvenirs-cotillon', group: 'Cumpleaños y Eventos', orderIndex: 51 },

  // Salud y Terapias
  { name: 'Psicopedagogía', slug: 'psicopedagogia', group: 'Salud y Terapias', orderIndex: 60 },
  { name: 'Fonoaudiología Infantil', slug: 'fonoaudiologia', group: 'Salud y Terapias', orderIndex: 61 },
  { name: 'Psicología Infantil y Juvenil', slug: 'psicologia-infantil', group: 'Salud y Terapias', orderIndex: 62 },
  { name: 'Orientación a Padres y Familias', slug: 'orientacion-padres', group: 'Salud y Terapias', orderIndex: 63 },
  { name: 'Terapia Ocupacional Infantil', slug: 'terapia-ocupacional', group: 'Salud y Terapias', orderIndex: 64 },
  { name: 'Psicomotricidad', slug: 'psicomotricidad', group: 'Salud y Terapias', orderIndex: 65 },
  { name: 'Nutrición Pediátrica', slug: 'nutricion-pediatrica', group: 'Salud y Terapias', orderIndex: 66 },
  { name: 'Pediatría', slug: 'pediatria', group: 'Salud y Terapias', orderIndex: 67 },
  { name: 'Odontopediatría', slug: 'odontopediatria', group: 'Salud y Terapias', orderIndex: 68 },

  // Deportes y Actividades Extracurriculares
  { name: 'Natación Infantil', slug: 'natacion-infantil', group: 'Deportes y Actividades', orderIndex: 70 },
  { name: 'Escuelita de Fútbol', slug: 'futbol-infantil', group: 'Deportes y Actividades', orderIndex: 71 },
  { name: 'Gimnasia Artística y Acrobacia', slug: 'gimnasia-acrobacia', group: 'Deportes y Actividades', orderIndex: 72 },
  { name: 'Yoga y Mindfulness Infantil', slug: 'yoga-infantil', group: 'Deportes y Actividades', orderIndex: 73 },
  { name: 'Danza y Ballet Infantil', slug: 'danza-ballet', group: 'Deportes y Actividades', orderIndex: 74 },
  { name: 'Teatro y Expresión Corporal', slug: 'teatro-infantil', group: 'Deportes y Actividades', orderIndex: 75 },
  { name: 'Artes Plásticas y Pintura', slug: 'artes-plasticas', group: 'Deportes y Actividades', orderIndex: 76 },
  { name: 'Robótica y Programación', slug: 'robotica-programacion', group: 'Deportes y Actividades', orderIndex: 77 },
  { name: 'Ajedrez', slug: 'ajedrez', group: 'Deportes y Actividades', orderIndex: 78 },
  { name: 'Clases de Guitarra y Ukelele', slug: 'clases-guitarra', group: 'Deportes y Actividades', orderIndex: 79 },
  { name: 'Clases de Piano y Teclado', slug: 'clases-piano', group: 'Deportes y Actividades', orderIndex: 80 },
  { name: 'Clases de Canto', slug: 'clases-canto', group: 'Deportes y Actividades', orderIndex: 81 },
  { name: 'Clases de Batería y Percusión', slug: 'clases-bateria', group: 'Deportes y Actividades', orderIndex: 82 },

  // Uniformes, Libros y Materiales
  { name: 'Uniformes Escolares Nuevos', slug: 'uniformes-nuevos', group: 'Uniformes y Libros', orderIndex: 90 },
  { name: 'Uniformes Escolares Usados', slug: 'uniformes-usados', group: 'Uniformes y Libros', orderIndex: 91 },
  { name: 'Arreglo y Costura de Uniformes', slug: 'arreglo-costura', group: 'Uniformes y Libros', orderIndex: 92 },
  { name: 'Libros de Texto y Manuales', slug: 'libros-manuales', group: 'Uniformes y Libros', orderIndex: 93 },
  { name: 'Mochilas y Cartucheras', slug: 'mochilas-cartucheras', group: 'Uniformes y Libros', orderIndex: 94 },
  { name: 'Librería y Útiles Escolares', slug: 'libreria-utiles', group: 'Uniformes y Libros', orderIndex: 95 },
  { name: 'Material Didáctico y Juegos Educativos', slug: 'material-didactico', group: 'Uniformes y Libros', orderIndex: 96 },

  // Hogar y Familia
  { name: 'Viandas Escolares y Comidas Caseras', slug: 'viandas-escolares', group: 'Hogar y Familia', orderIndex: 100 },
  { name: 'Comida Saludable para Familias', slug: 'comida-saludable', group: 'Hogar y Familia', orderIndex: 101 },
  { name: 'Organización de Espacios y Placares', slug: 'organizacion-espacios', group: 'Hogar y Familia', orderIndex: 102 },
  { name: 'Limpieza del Hogar', slug: 'limpieza-hogar', group: 'Hogar y Familia', orderIndex: 103 },
  { name: 'Paseo y Cuidado de Mascotas', slug: 'paseo-mascotas', group: 'Hogar y Familia', orderIndex: 104 },
];
