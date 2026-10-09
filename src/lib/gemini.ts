/**
 * Gemini AI Moderation Pipeline for Comunidades de Colegios (by Criana)
 *
 * Implements orthotypographic and grammatical correction using Google Gemini
 * (gemini-2.5-flash) while strictly preserving Argentine school colloquialisms,
 * idioms, tone, and advertiser meaning.
 */

export const ARGENTINE_SCHOOL_COLLOQUIALISMS = [
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
] as const;

export interface GeminiModerationInput {
  title: string;
  description: string;
}

export interface GeminiModerationResult {
  correctedTitle: string;
  correctedDescription: string;
  flagged: boolean;
  isFlagged: boolean; // Alias for backward compatibility
  flagReason: string | null;
}

const HARMFUL_CONTENT_REGEX =
  /\b(violencia|arma|armas|droga|drogas|estafa|estafas|pornografia|pornografía|prostitucion|prostitución|apuesta|apuestas|ilegal|ilegales|sicario|sicarios)\b/i;

/**
 * Deterministic rule-based fallback corrector when Gemini API is offline or key is missing.
 * Preserves school idioms, corrects common abbreviations (q -> que, xq -> porque),
 * fixes capitalization and extra whitespace.
 */
export function applyLocalRuleBasedCorrection(
  input: GeminiModerationInput
): GeminiModerationResult {
  const isFlagged =
    HARMFUL_CONTENT_REGEX.test(input.title) ||
    HARMFUL_CONTENT_REGEX.test(input.description);

  const cleanText = (text: string) => {
    let t = text
      .replace(/\bqe\b|\bq\b/gi, 'que')
      .replace(/\bxq\b/gi, 'porque')
      .replace(/\btmb\b/gi, 'también')
      .replace(/\s+/g, ' ')
      .trim();

    if (t.length > 0) {
      t = t.charAt(0).toUpperCase() + t.slice(1);
    }
    return t;
  };

  const correctedTitle = cleanText(input.title);
  const correctedDescription = cleanText(input.description);

  return {
    correctedTitle,
    correctedDescription,
    flagged: isFlagged,
    isFlagged,
    flagReason: isFlagged
      ? 'Contenido potencialmente inapropiado o contrario a las políticas comunitarias'
      : null,
  };
}

/**
 * System prompt instructing Gemini to perform orthotypographic correction
 * while strictly respecting Argentine school colloquialisms and community context.
 */
function buildGeminiSystemPrompt(): string {
  return `Sos un asistente editorial especializado en moderación y corrección ortotipográfica para avisos comunitarios escolares en Argentina ('Comunidades de Colegios by Criana').

Tu tarea es corregir la ortografía, acentuación, puntuación y mayúsculas del título y descripción provistos, cumpliendo las siguientes REGLAS ESTRICTAS:

1. PRESERVACIÓN DE MODISMOS ESCOLARES ARGENTINOS (MANDATORIO):
   Bajo NINGÚN concepto debes sustituir, eliminar ni 'españolizar/formalizar' los términos, modismos o giros coloquiales escolares argentinos. Debes PRESERVAR RIGUROSAMENTE palabras como:
   - "chicos" (no cambiar por "niños" ni "alumnos")
   - "viandas" (no cambiar por "almuerzos" ni "comidas preparadas")
   - "profe" (no cambiar por "profesor" ni "docente")
   - "egresados" (no alterar)
   - "seño" (no cambiar por "maestra" ni "señorita")
   - "campera" (no cambiar por "chaqueta" ni "abrigo")
   - "guardapolvo" (no cambiar por "delantal" ni "bata")
   - "colegio" o "cole" (no sustituir)
   - "anotarse" (no cambiar por "inscribirse")
   - "clases de apoyo" (no alterar)
   - "compas", "mamis y papis", "sala de 4", "wsp", "burbuja"

2. SENTIDO Y DATOS DE CONTACTO:
   No alteres el sentido del autor, precios, horarios, números de teléfono ni enlaces web.

3. EVALUACIÓN DE SEGURIDAD (MODERACIÓN):
   Si el aviso contiene contenido dañino, violento, drogas, armas, pornografía, estafas o discriminación:
   - "flagged": true
   - "flagReason": descripción breve en español del motivo
   Si el aviso es comunitario y seguro:
   - "flagged": false
   - "flagReason": null

4. FORMATO DE SALIDA:
   Debes responder ÚNICAMENTE con un JSON estrictamente válido con esta estructura:
   {
     "correctedTitle": "string",
     "correctedDescription": "string",
     "flagged": boolean,
     "flagReason": string | null
   }`;
}

/**
 * Moderate and correct text using Gemini 2.5 Flash.
 * Falls back safely to deterministic local rules if the API key is not present or if an error occurs.
 */
export async function moderateContentWithGemini(
  input: GeminiModerationInput
): Promise<GeminiModerationResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey || apiKey === 'test-dummy-key' || apiKey.startsWith('AQ.')) {
    return applyLocalRuleBasedCorrection(input);
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const promptText = `${buildGeminiSystemPrompt()}\n\nContenido a revisar:\nTítulo: ${input.title}\nDescripción: ${input.description}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: promptText }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      console.warn(
        `Gemini API returned status ${response.status}. Falling back to rule-based correction.`
      );
      return applyLocalRuleBasedCorrection(input);
    }

    const data = await response.json();
    const candidateText =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!candidateText) {
      return applyLocalRuleBasedCorrection(input);
    }

    // Strip optional markdown fencing if present
    const cleanJson = candidateText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleanJson);

    const isFlagged = Boolean(parsed.flagged ?? parsed.isFlagged);
    const flagReason = parsed.flagReason ?? (isFlagged ? 'Contenido marcado por IA' : null);

    let correctedTitle =
      typeof parsed.correctedTitle === 'string' && parsed.correctedTitle.trim()
        ? parsed.correctedTitle.trim()
        : input.title;

    let correctedDescription =
      typeof parsed.correctedDescription === 'string' &&
      parsed.correctedDescription.trim()
        ? parsed.correctedDescription.trim()
        : input.description;

    // Safeguard invariant: ensure Argentine school colloquialisms were not stripped
    for (const slang of ARGENTINE_SCHOOL_COLLOQUIALISMS) {
      const slangRegex = new RegExp(`\\b${slang}\\b`, 'i');
      if (slangRegex.test(input.title) && !slangRegex.test(correctedTitle)) {
        // Restore slang in title if model mistakenly altered it
        correctedTitle = input.title;
      }
      if (slangRegex.test(input.description) && !slangRegex.test(correctedDescription)) {
        // Restore slang in description if model mistakenly altered it
        correctedDescription = input.description;
      }
    }

    return {
      correctedTitle,
      correctedDescription,
      flagged: isFlagged,
      isFlagged,
      flagReason,
    };
  } catch (error) {
    console.warn(
      'Gemini API request failed or timed out. Falling back to local rules:',
      error instanceof Error ? error.message : error
    );
    return applyLocalRuleBasedCorrection(input);
  }
}
