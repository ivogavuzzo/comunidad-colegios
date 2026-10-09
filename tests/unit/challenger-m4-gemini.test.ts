import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  moderateContentWithGemini,
  applyLocalRuleBasedCorrection,
  ARGENTINE_SCHOOL_COLLOQUIALISMS,
} from '@/lib/gemini';
import { POST as handleListingsPost, GET as handleListingsGet } from '@/app/api/listings/route';
import { GET as handleOtpGet } from '@/app/api/moderation/otp/route';
import { NextRequest } from 'next/server';

describe('EMPIRICAL CHALLENGER M4 — Gemini AI Moderation Pipeline & PENDING Lifecycle (F18, F19)', () => {
  const TEST_PREFIX = '[CHALLENGER-M4-GEMINI]';
  let testUser: any;
  let testSchool: any;
  let testCategory: any;
  let testSubcategory: any;

  const createdListingIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    await prisma.$connect();

    testSchool = await prisma.school.findFirst({
      where: { jurisdiccion: 'CABA' },
    });
    if (!testSchool) {
      testSchool = await prisma.school.create({
        data: {
          cueanexo: '020999902',
          nombre: 'COLEGIO CHALLENGER GEMINI',
          domicilio: 'AV. SANTA FE 2000',
          jurisdiccion: 'CABA',
          departamento: 'Comuna 2',
          localidad: 'RECOLETA',
        },
      });
    }

    testCategory = await prisma.category.findFirst({
      include: { subcategories: true },
    });
    testSubcategory = testCategory.subcategories[0];

    testUser = await prisma.user.create({
      data: {
        email: `gemini-challenger-${Date.now()}@test-domain.com`,
        name: 'Mamá Challenger Gemini',
        dni: '35123456',
        isOnboarded: true,
        schoolOfOriginId: testSchool.id,
      },
    });
    createdUserIds.push(testUser.id);
  });

  afterAll(async () => {
    // Teardown created listings and related records
    if (createdListingIds.length > 0) {
      await prisma.contactClick.deleteMany({
        where: { listingId: { in: createdListingIds } },
      });
      await prisma.moderationOtpToken.deleteMany({
        where: { listingId: { in: createdListingIds } },
      });
      await prisma.listingImage.deleteMany({
        where: { listingId: { in: createdListingIds } },
      });
      await prisma.listing.deleteMany({
        where: { id: { in: createdListingIds } },
      });
    }

    // Teardown users
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }
  });

  // =========================================================================
  // 1. PRESERVATION OF ARGENTINE SCHOOL IDIOMS UNDER VARIED CASING & CONTEXTS
  // =========================================================================
  describe('1. Preservation of Argentine School Colloquialisms (F18.1)', () => {
    it('defines all 16 canonical Argentine school colloquialisms', () => {
      expect(ARGENTINE_SCHOOL_COLLOQUIALISMS).toHaveLength(16);
      const expectedSlangs = [
        'chicos',
        'viandas',
        'profe',
        'egresados',
        'seño',
        'campera',
        'guardapolvo',
        'colegio',
        'anotarse',
        'clases de apoyo',
        'cole',
        'compas',
        'mamis y papis',
        'sala de 4',
        'burbuja',
        'wsp',
      ];
      for (const slang of expectedSlangs) {
        expect(ARGENTINE_SCHOOL_COLLOQUIALISMS).toContain(slang);
      }
    });

    it('preserves each slang in lowercase without alteration', () => {
      for (const slang of ARGENTINE_SCHOOL_COLLOQUIALISMS) {
        const input = {
          title: `Aviso de ${slang} para toda la comunidad`,
          description: `Servicio exclusivo de ${slang} organizado por familias`,
        };
        const result = applyLocalRuleBasedCorrection(input);
        expect(result.correctedTitle.toLowerCase()).toContain(slang.toLowerCase());
        expect(result.correctedDescription.toLowerCase()).toContain(slang.toLowerCase());
        expect(result.isFlagged).toBe(false);
      }
    });

    it('preserves each slang in UPPERCASE without alteration', () => {
      for (const slang of ARGENTINE_SCHOOL_COLLOQUIALISMS) {
        const slangUpper = slang.toUpperCase();
        const input = {
          title: `AVISO DE ${slangUpper} IMPORTANTE`,
          description: `ORGANIZACIÓN DE ${slangUpper} EN LA PUERTA`,
        };
        const result = applyLocalRuleBasedCorrection(input);
        expect(result.correctedTitle.toUpperCase()).toContain(slangUpper);
        expect(result.correctedDescription.toUpperCase()).toContain(slangUpper);
      }
    });

    it('preserves each slang under TitleCase / MixedCase', () => {
      for (const slang of ARGENTINE_SCHOOL_COLLOQUIALISMS) {
        const slangTitle = slang
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        const input = {
          title: `Taller de ${slangTitle} Comunitario`,
          description: `Iniciativa de ${slangTitle} para el ciclo lectivo`,
        };
        const result = applyLocalRuleBasedCorrection(input);
        expect(result.correctedTitle.toLowerCase()).toContain(slang.toLowerCase());
        expect(result.correctedDescription.toLowerCase()).toContain(slang.toLowerCase());
      }
    });

    it('preserves slangs wrapped with Spanish inverted punctuation (¡!, ¿?)', () => {
      const phrases = [
        { text: '¡chicos! vengan al taller', slang: 'chicos' },
        { text: '¿profe? consulta por clases', slang: 'profe' },
        { text: '¡SEÑO! muchas gracias por el año', slang: 'seño' },
        { text: '¿anotarse? los cupos están abiertos', slang: 'anotarse' },
        { text: '¡cole! arrancamos el lunes', slang: 'cole' },
        { text: '¿wsp? consultanos acá', slang: 'wsp' },
      ];

      for (const p of phrases) {
        const res = applyLocalRuleBasedCorrection({
          title: p.text,
          description: p.text,
        });
        expect(res.correctedTitle.toLowerCase()).toContain(p.slang.toLowerCase());
        expect(res.correctedDescription.toLowerCase()).toContain(p.slang.toLowerCase());
      }
    });

    it('preserves slangs wrapped in quotes, brackets, and varied punctuation', () => {
      const cases = [
        { text: 'Servicio de "viandas" caseras', slang: 'viandas' },
        { text: 'Vendo (campera) de egresados', slang: 'campera' },
        { text: 'Talle 12 [guardapolvo] impecable', slang: 'guardapolvo' },
        { text: 'Reunión de «mamis y papis» del cole', slang: 'mamis y papis' },
        { text: 'Ingreso a «sala de 4» en turno mañana', slang: 'sala de 4' },
        { text: 'Grupo de burbuja; cuidamos los cupos', slang: 'burbuja' },
        { text: 'Juntada con compas: salida al cine', slang: 'compas' },
      ];

      for (const c of cases) {
        const res = applyLocalRuleBasedCorrection({
          title: c.text,
          description: c.text,
        });
        expect(res.correctedTitle.toLowerCase()).toContain(c.slang.toLowerCase());
        expect(res.correctedDescription.toLowerCase()).toContain(c.slang.toLowerCase());
      }
    });

    it('preserves complex sentences combining multiple Argentine school idioms', () => {
      const multiSlangInput = {
        title: 'Viandas para chicos del cole con la seño',
        description:
          'Mamis y papis del colegio: organizamos viandas y campera de egresados con los compas por wsp para sala de 4 y clases de apoyo',
      };

      const res = applyLocalRuleBasedCorrection(multiSlangInput);
      expect(res.correctedTitle).toContain('Viandas');
      expect(res.correctedTitle).toContain('chicos');
      expect(res.correctedTitle).toContain('cole');
      expect(res.correctedTitle).toContain('seño');

      expect(res.correctedDescription).toContain('Mamis y papis');
      expect(res.correctedDescription).toContain('colegio');
      expect(res.correctedDescription).toContain('viandas');
      expect(res.correctedDescription).toContain('campera');
      expect(res.correctedDescription).toContain('egresados');
      expect(res.correctedDescription).toContain('compas');
      expect(res.correctedDescription).toContain('wsp');
      expect(res.correctedDescription).toContain('sala de 4');
      expect(res.correctedDescription).toContain('clases de apoyo');
    });

    it('restores original Argentine idioms if simulated remote Gemini API strips or formalizes them', async () => {
      const originalFetch = global.fetch;
      const originalKey = process.env.GEMINI_API_KEY;

      process.env.GEMINI_API_KEY = 'mock-valid-gemini-key-12345';

      // Simulate a remote Gemini API model that formalizes Argentine slang into neutral Spanish
      // "chicos" -> "niños", "viandas" -> "almuerzos preparados"
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      correctedTitle: 'Clases particulares para niños en edad escolar',
                      correctedDescription: 'Ofrecemos almuerzos preparados para los alumnos',
                      flagged: false,
                      flagReason: null,
                    }),
                  },
                ],
              },
            },
          ],
        }),
      } as any);

      try {
        const input = {
          title: 'Clases particulares para chicos en edad escolar',
          description: 'Ofrecemos viandas para los chicos',
        };

        const result = await moderateContentWithGemini(input);

        // Safeguard invariant: must restore original Argentine phrasing
        expect(result.correctedTitle).toContain('chicos');
        expect(result.correctedDescription).toContain('viandas');
      } finally {
        global.fetch = originalFetch;
        process.env.GEMINI_API_KEY = originalKey;
      }
    });
  });

  // =========================================================================
  // 2. PROPER ORTHOTYPOGRAPHIC CORRECTIONS & ABBREVIATION EXPANSIONS (F18.2)
  // =========================================================================
  describe('2. Proper Orthotypographic Corrections (F18.2)', () => {
    it('corrects informal Spanish chat abbreviations (q -> que, qe -> que, xq -> porque, tmb -> también)', () => {
      const input = {
        title: 'q linda clase xq aprenden un monton',
        description: 'qe vengan tmb los hermanos xq hay lugar para todos',
      };

      const result = applyLocalRuleBasedCorrection(input);
      expect(result.correctedTitle).toContain('que');
      expect(result.correctedTitle).toContain('porque');
      expect(result.correctedTitle).not.toMatch(/\bq\b/i);
      expect(result.correctedTitle).not.toMatch(/\bxq\b/i);

      expect(result.correctedDescription).toContain('que');
      expect(result.correctedDescription).toContain('también');
      expect(result.correctedDescription).toContain('porque');
      expect(result.correctedDescription).not.toMatch(/\bqe\b/i);
      expect(result.correctedDescription).not.toMatch(/\btmb\b/i);
    });

    it('corrects uppercase abbreviations properly (Q -> que/Que, XQ -> porque, TMB -> también)', () => {
      const input = {
        title: 'Q lindo dia XQ abrio el cole',
        description: 'Vengan TMB maniana',
      };

      const result = applyLocalRuleBasedCorrection(input);
      // Capitalized start of sentence
      expect(result.correctedTitle.startsWith('Que')).toBe(true);
      expect(result.correctedTitle).toContain('porque');
      expect(result.correctedDescription).toContain('también');
    });

    it('does NOT mutilate real Spanish words containing abbreviation substrings (boundary check)', () => {
      // "queso", "taquilla", "pesquisa", "ataque", "bloque", "parque", "tambor", "retumbe"
      const input = {
        title: 'queso y empanadas para el acto en el parque',
        description: 'pesquisa de taquilla con enfoque en el ataque de tambor',
      };

      const result = applyLocalRuleBasedCorrection(input);

      // Verify no spurious expansions occurred
      expect(result.correctedTitle).toContain('Queso');
      expect(result.correctedTitle).toContain('parque');
      expect(result.correctedTitle).not.toContain('queeso');
      expect(result.correctedTitle).not.toContain('parquee');

      expect(result.correctedDescription).toContain('Pesquisa');
      expect(result.correctedDescription).toContain('taquilla');
      expect(result.correctedDescription).toContain('enfoque');
      expect(result.correctedDescription).toContain('ataque');
      expect(result.correctedDescription).toContain('tambor');
      expect(result.correctedDescription).not.toContain('tambiénor');
    });

    it('normalizes extra whitespace and trims edges', () => {
      const input = {
        title: '   clases    de    matematica    para    chicos   ',
        description: '   apoyo    escolar    personalizado    en    el    cole   ',
      };

      const result = applyLocalRuleBasedCorrection(input);
      expect(result.correctedTitle).toBe('Clases de matematica para chicos');
      expect(result.correctedDescription).toBe('Apoyo escolar personalizado en el cole');
    });

    it('capitalizes first letter of sentence while handling leading inverted punctuation', () => {
      const inputInverted = {
        title: '¿q horarios tienen disponibles?',
        description: '¡xq no me avisaron antes!',
      };

      const result = applyLocalRuleBasedCorrection(inputInverted);
      expect(result.correctedTitle).toBe('¿que horarios tienen disponibles?');
      expect(result.correctedDescription).toBe('¡porque no me avisaron antes!');
    });

    it('handles empty and whitespace-only inputs without crashing', () => {
      const inputEmpty = {
        title: '',
        description: '   ',
      };

      const result = applyLocalRuleBasedCorrection(inputEmpty);
      expect(result.correctedTitle).toBe('');
      expect(result.correctedDescription).toBe('');
      expect(result.isFlagged).toBe(false);
    });
  });

  // =========================================================================
  // 3. HARMFUL CONTENT DETECTION & ABUSE FLAGGING (F18.4)
  // =========================================================================
  describe('3. Harmful Content Detection & Abuse Flagging (F18.4)', () => {
    const harmfulTerms = [
      'violencia',
      'arma',
      'armas',
      'droga',
      'drogas',
      'estafa',
      'estafas',
      'pornografia',
      'pornografía',
      'prostitucion',
      'prostitución',
      'apuesta',
      'apuestas',
      'ilegal',
      'ilegales',
      'sicario',
      'sicarios',
    ];

    it.each(harmfulTerms)('flags harmful term "%s" when present in title', (term) => {
      const input = {
        title: `Servicio de ${term} en la zona escolar`,
        description: 'Contacto directo por privado',
      };
      const result = applyLocalRuleBasedCorrection(input);
      expect(result.isFlagged).toBe(true);
      expect(result.flagged).toBe(true);
      expect(result.flagReason).not.toBeNull();
      expect(result.flagReason).toContain('inapropiado');
    });

    it.each(harmfulTerms)('flags harmful term "%s" when present in description only', (term) => {
      const input = {
        title: 'Clases particulares de matemáticas',
        description: `Se ofrece ${term} con entrega rápida`,
      };
      const result = applyLocalRuleBasedCorrection(input);
      expect(result.isFlagged).toBe(true);
      expect(result.flagged).toBe(true);
      expect(result.flagReason).not.toBeNull();
    });

    it('flags harmful terms under varied casing (uppercase, mixed case)', () => {
      const testCases = [
        'VENTA DE ARMAS DE FUEGO',
        'Distribuimos DrOgAs en la zona',
        'Oferta de ILEGALES pasajes',
        'Servicio de SiCaRiOs disponible',
        'ApUeStAs clandestinas',
      ];

      for (const text of testCases) {
        const result = applyLocalRuleBasedCorrection({
          title: text,
          description: 'Contacto inmediato',
        });
        expect(result.isFlagged).toBe(true);
      }
    });

    it('flags harmful terms wrapped in punctuation', () => {
      const punctuatedCases = [
        '¡armas!',
        '¿droga?',
        '(estafas)',
        '"sicarios"',
        'ilegales,',
        'apuestas...',
      ];

      for (const p of punctuatedCases) {
        const result = applyLocalRuleBasedCorrection({
          title: `Atención: ${p}`,
          description: 'Sin requisitos',
        });
        expect(result.isFlagged).toBe(true);
      }
    });

    it('does NOT trigger false positives on legitimate benign words with similar substrings', () => {
      const benignPhrases = [
        'armario escolar de madera',
        'armadura medieval para acto patrio',
        'estafeta postal del barrio',
        'docente dispuesta a coordinar talleres',
        'marco legal educativo y normas de convivencia',
        'comunidades legales del colegio',
        'droguería de turno cercana al colegio',
        'apuesto por el futuro de nuestros chicos',
        'delegado del curso de egresados',
      ];

      for (const phrase of benignPhrases) {
        const result = applyLocalRuleBasedCorrection({
          title: phrase,
          description: phrase,
        });
        expect(result.isFlagged).toBe(false);
        expect(result.flagged).toBe(false);
        expect(result.flagReason).toBeNull();
      }
    });
  });

  // =========================================================================
  // 4. OFFLINE FALLBACK DETERMINISM & RESILIENCE (F18.3)
  // =========================================================================
  describe('4. Offline Fallback Determinism & Network Resilience (F18.3)', () => {
    it('deterministically uses local fallback when GEMINI_API_KEY is undefined or empty', async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const input = {
        title: 'q linda clase de musica',
        description: 'viandas para los chicos',
      };

      const result = await moderateContentWithGemini(input);
      expect(result.correctedTitle).toBe('Que linda clase de musica');
      expect(result.correctedDescription).toBe('Viandas para los chicos');
      expect(result.isFlagged).toBe(false);

      process.env.GEMINI_API_KEY = originalKey;
    });

    it('deterministically uses local fallback when GEMINI_API_KEY is whitespace or dummy key', async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      const dummyKeys = ['   ', 'test-dummy-key', 'AQ.fakekey123'];

      for (const dummy of dummyKeys) {
        process.env.GEMINI_API_KEY = dummy;
        const input = {
          title: 'xq no viniste al cole',
          description: 'aviso p/ chicos',
        };
        const result = await moderateContentWithGemini(input);
        expect(result.correctedTitle).toBe('Porque no viniste al cole');
        expect(result.correctedDescription).toContain('chicos');
      }
      process.env.GEMINI_API_KEY = originalKey;
    });

    it('falls back to local rules when Gemini API network request throws TypeError (offline/DNS failure)', async () => {
      const originalFetch = global.fetch;
      const originalKey = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = 'valid-key-for-network-test';

      global.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed: ENOTFOUND'));

      try {
        const input = {
          title: 'q buen taller xq aprenden',
          description: 'viandas caseras',
        };
        const result = await moderateContentWithGemini(input);

        expect(result.correctedTitle).toBe('Que buen taller porque aprenden');
        expect(result.correctedDescription).toBe('Viandas caseras');
        expect(result.isFlagged).toBe(false);
      } finally {
        global.fetch = originalFetch;
        process.env.GEMINI_API_KEY = originalKey;
      }
    });

    it('falls back to local rules when Gemini API returns HTTP 500 error', async () => {
      const originalFetch = global.fetch;
      const originalKey = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = 'valid-key-for-500-test';

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      } as any);

      try {
        const input = {
          title: 'tmb vendemos uniformes',
          description: 'campera de egresados',
        };
        const result = await moderateContentWithGemini(input);

        expect(result.correctedTitle).toBe('También vendemos uniformes');
        expect(result.correctedDescription).toBe('Campera de egresados');
      } finally {
        global.fetch = originalFetch;
        process.env.GEMINI_API_KEY = originalKey;
      }
    });

    it('falls back to local rules when Gemini API returns HTTP 429 rate limit error', async () => {
      const originalFetch = global.fetch;
      const originalKey = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = 'valid-key-for-429-test';

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
      } as any);

      try {
        const input = {
          title: 'q linda jornada',
          description: 'con la seño y compas',
        };
        const result = await moderateContentWithGemini(input);

        expect(result.correctedTitle).toBe('Que linda jornada');
        expect(result.correctedDescription).toContain('seño');
      } finally {
        global.fetch = originalFetch;
        process.env.GEMINI_API_KEY = originalKey;
      }
    });

    it('falls back to local rules when Gemini API returns malformed JSON or empty content', async () => {
      const originalFetch = global.fetch;
      const originalKey = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = 'valid-key-for-json-test';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: '{ bad json syntax ' }],
              },
            },
          ],
        }),
      } as any);

      try {
        const input = {
          title: 'q alegria volver al cole',
          description: 'clases de apoyo',
        };
        const result = await moderateContentWithGemini(input);

        expect(result.correctedTitle).toBe('Que alegria volver al cole');
        expect(result.correctedDescription).toBe('Clases de apoyo');
      } finally {
        global.fetch = originalFetch;
        process.env.GEMINI_API_KEY = originalKey;
      }
    });

    it('correctly unwraps markdown-fenced JSON responses from Gemini API', async () => {
      const originalFetch = global.fetch;
      const originalKey = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = 'valid-key-for-fenced-test';

      const fencedJson = '```json\n{\n  "correctedTitle": "Clases de Matemáticas",\n  "correctedDescription": "Apoyo escolar para chicos",\n  "flagged": false,\n  "flagReason": null\n}\n```';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: fencedJson }],
              },
            },
          ],
        }),
      } as any);

      try {
        const input = {
          title: 'clases de matematicas',
          description: 'apoyo escolar para chicos',
        };
        const result = await moderateContentWithGemini(input);

        expect(result.correctedTitle).toBe('Clases de Matemáticas');
        expect(result.correctedDescription).toBe('Apoyo escolar para chicos');
        expect(result.isFlagged).toBe(false);
      } finally {
        global.fetch = originalFetch;
        process.env.GEMINI_API_KEY = originalKey;
      }
    });
  });

  // =========================================================================
  // 5. MILESTONE 4 & F19 INTEGRATION: LISTING CREATION, PENDING STATUS & OTP
  // =========================================================================
  describe('5. Milestone 4 & F19 Integration: Listing Lifecycle', () => {
    it('creates listing in strictly PENDING status with AI corrected fields populated', async () => {
      const timestamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const payload = {
        title: `${TEST_PREFIX} q linda clase de apoyo ${timestamp}`,
        description: 'viandas caseras para los chicos q se quedan en el cole',
        categoryId: testCategory.id,
        subcategoryId: testSubcategory.id,
        schoolId: testSchool.id,
        whatsapp: '1144556677',
        email: 'contacto@ejemplo.com',
        userId: testUser.id,
      };

      const req = new NextRequest('http://localhost:3000/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await handleListingsPost(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.listing).toBeDefined();

      const listing = json.listing;
      createdListingIds.push(listing.id);

      // Verify F19: status MUST be strictly PENDING
      expect(listing.status).toBe('PENDING');

      // Verify F18: aiCorrectedTitle and aiCorrectedDesc are populated
      expect(listing.aiCorrectedTitle).toContain('que linda clase de apoyo');
      expect(listing.aiCorrectedDesc).toContain('Viandas');
      expect(listing.aiCorrectedDesc).toContain('chicos');
      expect(listing.aiCorrectedDesc).toContain('que');
      expect(listing.aiCorrectedDesc).toContain('cole');

      // Verify DB persistence
      const dbListing = await prisma.listing.findUnique({
        where: { id: listing.id },
        include: { moderationTokens: true },
      });
      expect(dbListing).not.toBeNull();
      expect(dbListing?.status).toBe('PENDING');
      expect(dbListing?.moderationTokens).toHaveLength(2);

      const actions = dbListing?.moderationTokens.map((t) => t.action).sort();
      expect(actions).toEqual(['APPROVE', 'REJECT']);
    });

    it('flags harmful listing with aiModerationStatus: FLAGGED while retaining status: PENDING', async () => {
      const timestamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const payload = {
        title: `${TEST_PREFIX} Venta de armas y drogas ${timestamp}`,
        description: 'Servicio ilegal en la puerta del colegio',
        categoryId: testCategory.id,
        subcategoryId: testSubcategory.id,
        schoolId: testSchool.id,
        whatsapp: '1144556677',
        userId: testUser.id,
      };

      const req = new NextRequest('http://localhost:3000/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await handleListingsPost(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      const listing = json.listing;
      createdListingIds.push(listing.id);

      // Status must remain PENDING (awaiting review/rejection)
      expect(listing.status).toBe('PENDING');

      const dbListing = await prisma.listing.findUnique({
        where: { id: listing.id },
      });
      expect(dbListing?.status).toBe('PENDING');
      expect(dbListing?.aiModerationStatus).toBe('FLAGGED');
    });

    it('ensures PENDING listings are excluded from the public catalog', async () => {
      // 1. Create a pending listing
      const timestamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const payload = {
        title: `${TEST_PREFIX} Aviso Invisible Pendiente ${timestamp}`,
        description: 'Este aviso no debe verse en el catalogo publico todavia',
        categoryId: testCategory.id,
        subcategoryId: testSubcategory.id,
        schoolId: testSchool.id,
        whatsapp: '1199887766',
        userId: testUser.id,
      };

      const postReq = new NextRequest('http://localhost:3000/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const postRes = await handleListingsPost(postReq);
      const postJson = await postRes.json();
      const listing = postJson.listing;
      createdListingIds.push(listing.id);

      // 2. Query public catalog
      const getReq = new NextRequest(
        `http://localhost:3000/api/listings?schoolId=${testSchool.id}`
      );
      const getRes = await handleListingsGet(getReq);
      expect(getRes.status).toBe(200);

      const catalog = await getRes.json();
      const found = catalog.find((item: any) => item.id === listing.id);
      expect(found).toBeUndefined(); // Must NOT appear in public catalog!
    });

    it('transitions listing to APPROVED and displays in catalog upon 1-click OTP approval', async () => {
      // 1. Create a pending listing
      const timestamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const payload = {
        title: `${TEST_PREFIX} Aviso para ser Aprobado ${timestamp}`,
        description: 'Taller de robotica para chicos en el cole',
        categoryId: testCategory.id,
        subcategoryId: testSubcategory.id,
        schoolId: testSchool.id,
        whatsapp: '1122334455',
        userId: testUser.id,
      };

      const postReq = new NextRequest('http://localhost:3000/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const postRes = await handleListingsPost(postReq);
      const postJson = await postRes.json();
      const listing = postJson.listing;
      createdListingIds.push(listing.id);

      // Find the approve token from DB
      const approveTokenRecord = await prisma.moderationOtpToken.findFirst({
        where: { listingId: listing.id, action: 'APPROVE' },
      });
      expect(approveTokenRecord).not.toBeNull();

      // 2. Execute 1-Click OTP approve request
      const otpReq = new NextRequest(
        `http://localhost:3000/api/moderation/otp?token=${approveTokenRecord?.token}&format=json`,
        { headers: { accept: 'application/json' } }
      );
      const otpRes = await handleOtpGet(otpReq);
      expect(otpRes.status).toBe(200);

      const otpJson = await otpRes.json();
      expect(otpJson.success).toBe(true);
      expect(otpJson.listingStatus).toBe('APPROVED');

      // 3. Query public catalog now: should appear!
      const getReq = new NextRequest(
        `http://localhost:3000/api/listings?schoolId=${testSchool.id}`
      );
      const getRes = await handleListingsGet(getReq);
      expect(getRes.status).toBe(200);

      const catalog = await getRes.json();
      const found = catalog.find((item: any) => item.id === listing.id);
      expect(found).toBeDefined();
      expect(found.status).toBe('APPROVED');
    });
  });
});
