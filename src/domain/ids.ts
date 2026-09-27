/**
 * Creates a random UUID (version 4).
 *
 * `crypto.randomUUID()` only exists in secure contexts (HTTPS or localhost), but the
 * dev build is also opened over plain HTTP on the local network, so the UUID is built
 * from `crypto.getRandomValues()`, which works everywhere.
 */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
