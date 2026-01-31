import crypto from 'crypto';

/**
 * Generate a cryptographically random code verifier for PKCE
 * @returns Base64URL encoded random string (43-128 characters)
 */
export function generateCodeVerifier(): string {
  const buffer = crypto.randomBytes(64);
  return base64UrlEncode(buffer);
}

/**
 * Generate a code challenge from a code verifier using S256 method
 * @param verifier The code verifier string
 * @returns Base64URL encoded SHA256 hash of the verifier
 */
export function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return base64UrlEncode(hash);
}

/**
 * Encode a buffer as base64url (URL-safe base64 without padding)
 * @param buffer The buffer to encode
 * @returns Base64URL encoded string
 */
function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate both code verifier and challenge for PKCE flow
 * @returns Object containing verifier and challenge
 */
export function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);
  return { verifier, challenge };
}
