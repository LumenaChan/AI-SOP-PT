// getRandomValues remains available on HTTP. Never fall back to Math.random.
export function randomId(provider = globalThis.crypto) {
  if (typeof provider?.randomUUID === "function") return provider.randomUUID();
  const values = provider.getRandomValues(new Uint8Array(16));
  values[6] = (values[6] & 0x0f) | 0x40;
  values[8] = (values[8] & 0x3f) | 0x80;
  const hex = Array.from(values, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function passwordKey(password, salt, iterations, provider = globalThis.crypto) {
  const input = new TextEncoder().encode(password);
  if (provider?.subtle) {
    const key = await provider.subtle.importKey("raw", input, "PBKDF2", false, ["deriveBits"]);
    return new Uint8Array(await provider.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256,
    ));
  }
  // Same PBKDF2-HMAC-SHA256, iterations and 32-byte output as WebCrypto.
  // Async implementation yields while working so forms remain responsive.
  const [{ pbkdf2Async }, { sha256 }] = await Promise.all([
    import("@noble/hashes/pbkdf2.js"),
    import("@noble/hashes/sha2.js"),
  ]);
  return pbkdf2Async(sha256, input, salt, { c: iterations, dkLen: 32, asyncTick: 10 });
}
