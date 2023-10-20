export function checkSum1B(u8a: Uint8Array): number {
  const c = u8a.reduce((a, b) => a + b, 0);
  return c & 0xff;
}
