import { createHash, createHmac } from "node:crypto";

export interface RandomEvidence {
  decisionId: string;
  stream: string;
  drawIndex: number;
  rawUint32: number;
  mappedValue: number;
  method: "hmac-sha256-rejection-v1";
}

export interface RandomSource {
  int(stream: string, minInclusive: number, maxExclusive: number): number;
  chance(stream: string, probabilityBps: number): boolean;
  evidence(): RandomEvidence[];
}

export function randomSeedId(runSeed: string): string {
  return createHash("sha256").update(runSeed).digest("hex").slice(0, 16);
}

export function createRandomSource(
  runSeed: string,
  commandId: string,
  strategyVersion: string,
): RandomSource {
  const records: RandomEvidence[] = [];
  const streamCounters = new Map<string, number>();

  function int(stream: string, minInclusive: number, maxExclusive: number): number {
    if (!Number.isSafeInteger(minInclusive) || !Number.isSafeInteger(maxExclusive) || maxExclusive <= minInclusive) {
      throw new Error(`Invalid random range [${minInclusive}, ${maxExclusive})`);
    }

    const range = maxExclusive - minInclusive;
    const limit = Math.floor(0x1_0000_0000 / range) * range;
    let raw = 0;
    let drawIndex = streamCounters.get(stream) ?? 0;
    do {
      const digest = createHmac("sha256", runSeed)
        .update(`${strategyVersion}|${commandId}|${stream}|${drawIndex}`)
        .digest();
      raw = digest.readUInt32BE(0);
      drawIndex += 1;
    } while (raw >= limit);

    streamCounters.set(stream, drawIndex);
    const mappedValue = minInclusive + (raw % range);
    records.push({
      decisionId: `${commandId}:${stream}:${drawIndex - 1}`,
      stream,
      drawIndex: drawIndex - 1,
      rawUint32: raw,
      mappedValue,
      method: "hmac-sha256-rejection-v1",
    });
    return mappedValue;
  }

  return {
    int,
    chance(stream, probabilityBps) {
      const bounded = Math.max(0, Math.min(10_000, Math.trunc(probabilityBps)));
      return int(stream, 0, 10_000) < bounded;
    },
    evidence: () => [...records],
  };
}
