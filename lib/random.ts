import { randomInt as nodeRandomInt } from "node:crypto";

function fallbackRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 1) return 0;
  const maxUint = 0xffffffff;
  const limit = Math.floor(maxUint / maxExclusive) * maxExclusive;
  const array = new Uint32Array(1);

  while (true) {
    globalThis.crypto.getRandomValues(array);
    const value = array[0];
    if (value < limit) return value % maxExclusive;
  }
}

export function secureRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 1) return 0;
  try {
    return nodeRandomInt(0, maxExclusive);
  } catch {
    return fallbackRandomInt(maxExclusive);
  }
}
