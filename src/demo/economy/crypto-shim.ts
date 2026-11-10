// Browser stand-in for the two node:crypto calls the economy engine makes (SHA-256 and HMAC-SHA-256),
// so the authoritative engine can also run fully client-side when the API is unreachable.
import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";

const encoder = new TextEncoder();
const toBytes = (value: string | Uint8Array) => (typeof value === "string" ? encoder.encode(value) : value);
const toHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

class DigestBuffer extends Uint8Array {
  readUInt32BE(offset = 0): number {
    return new DataView(this.buffer, this.byteOffset, this.byteLength).getUint32(offset, false);
  }
}

function digestOutput(bytes: Uint8Array, encoding?: string): string | DigestBuffer {
  if (encoding === "hex") return toHex(bytes);
  return new DigestBuffer(bytes);
}

export function createHash(algorithm: string) {
  if (algorithm !== "sha256") throw new Error(`Unsupported hash ${algorithm}`);
  const parts: Uint8Array[] = [];
  return {
    update(data: string | Uint8Array) {
      parts.push(toBytes(data));
      return this;
    },
    digest(encoding?: string) {
      const length = parts.reduce((sum, part) => sum + part.length, 0);
      const joined = new Uint8Array(length);
      let offset = 0;
      for (const part of parts) {
        joined.set(part, offset);
        offset += part.length;
      }
      return digestOutput(sha256(joined), encoding);
    },
  };
}

export function createHmac(algorithm: string, key: string | Uint8Array) {
  if (algorithm !== "sha256") throw new Error(`Unsupported HMAC ${algorithm}`);
  const mac = hmac.create(sha256, toBytes(key));
  return {
    update(data: string | Uint8Array) {
      mac.update(toBytes(data));
      return this;
    },
    digest(encoding?: string) {
      return digestOutput(mac.digest(), encoding);
    },
  };
}
