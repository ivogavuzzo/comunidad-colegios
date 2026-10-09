import crypto from 'crypto';

const CAPTCHA_SECRET =
  process.env.CAPTCHA_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  'criana-anti-spam-secret-key-2026';

export interface CaptchaChallenge {
  question: string;
  token: string;
}

export function generateCaptcha(): CaptchaChallenge {
  // Generate a friendly arithmetic challenge e.g. "7 + 5" or "12 - 4"
  const isAddition = Math.random() > 0.3;
  let num1: number;
  let num2: number;
  let answer: number;
  let question: string;

  if (isAddition) {
    num1 = Math.floor(Math.random() * 8) + 2; // 2 to 9
    num2 = Math.floor(Math.random() * 8) + 1; // 1 to 8
    answer = num1 + num2;
    question = `¿Cuánto es ${num1} + ${num2}?`;
  } else {
    num1 = Math.floor(Math.random() * 10) + 6; // 6 to 15
    num2 = Math.floor(Math.random() * 5) + 1;  // 1 to 5
    answer = num1 - num2;
    question = `¿Cuánto es ${num1} - ${num2}?`;
  }

  const exp = Date.now() + 15 * 60 * 1000; // 15 minutes expiry
  const payload = JSON.stringify({ ans: answer, exp });
  const payloadB64 = Buffer.from(payload, 'utf8').toString('base64url');

  const hmac = crypto
    .createHmac('sha256', CAPTCHA_SECRET)
    .update(payloadB64)
    .digest('hex');
  const token = `${payloadB64}.${hmac}`;

  return { question, token };
}

export function verifyCaptcha(
  token?: string | null,
  answer?: string | number | null
): { valid: boolean; error?: string } {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return { valid: false, error: 'Token de seguridad inválido o ausente.' };
  }

  const [payloadB64, providedHmac] = token.split('.');
  if (!payloadB64 || !providedHmac) {
    return { valid: false, error: 'Token de verificación corrupto.' };
  }

  const expectedHmac = crypto
    .createHmac('sha256', CAPTCHA_SECRET)
    .update(payloadB64)
    .digest('hex');

  const providedBuf = Buffer.from(providedHmac, 'hex');
  const expectedBuf = Buffer.from(expectedHmac, 'hex');

  if (
    providedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return { valid: false, error: 'Verificación de seguridad inválida.' };
  }

  try {
    const rawPayload = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const { ans, exp } = JSON.parse(rawPayload);

    if (typeof exp !== 'number' || Date.now() > exp) {
      return {
        valid: false,
        error: 'El desafío de seguridad ha expirado. Por favor solicitá uno nuevo.',
      };
    }

    if (String(answer ?? '').trim() !== String(ans)) {
      return {
        valid: false,
        error: 'Respuesta incorrecta a la pregunta de seguridad. Intentá de nuevo.',
      };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Error al descifrar el desafío de seguridad.' };
  }
}
