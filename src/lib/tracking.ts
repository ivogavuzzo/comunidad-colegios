import crypto from 'crypto';

export type ContactChannel = 'WHATSAPP' | 'EMAIL' | 'WEB';

export const VALID_CHANNELS: ContactChannel[] = ['WHATSAPP', 'EMAIL', 'WEB'];

/**
 * Computes SHA-256 hash of client IP address for privacy-preserving tracking.
 */
export function hashClientIp(ip: string): string {
  return crypto.createHash('sha256').update(ip.trim()).digest('hex');
}

/**
 * Normalizes input channel string to canonical ContactChannel.
 */
export function normalizeChannel(channel: string): ContactChannel | null {
  if (!channel || typeof channel !== 'string') return null;
  const upper = channel.trim().toUpperCase();
  if (upper === 'WHATSAPP') return 'WHATSAPP';
  if (upper === 'EMAIL') return 'EMAIL';
  if (upper === 'WEB' || upper === 'WEBSITE_IG') return 'WEB';
  return null;
}

/**
 * Client-side fire-and-forget contact click dispatcher.
 */
export async function trackContactClick(
  listingId: string,
  channel: ContactChannel | 'WEBSITE_IG'
): Promise<void> {
  try {
    if (typeof window === 'undefined') return;
    fetch('/api/track/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId, channel }),
      keepalive: true,
    }).catch(() => {
      // Fire-and-forget silent catch
    });
  } catch {
    // Silent catch
  }
}
