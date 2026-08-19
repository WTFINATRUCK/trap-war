import type { EconomyCommand } from "@trap-wars/economy-engine";
import { z } from "zod";

const commandId = z.string().min(1).max(128).regex(/^[A-Za-z0-9._:-]+$/);
const expectedStateVersion = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const quantity = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const identifier = z.string().min(1).max(80).regex(/^[a-z0-9_:-]+$/);

const commandEnvelope = {
  commandId,
  expectedStateVersion,
};

export const runCommandBodySchema = z.discriminatedUnion("commandType", [
  z.object({
    ...commandEnvelope,
    commandType: z.literal("BuyAsset"),
    payload: z.object({ assetId: identifier, quantity }).strict(),
  }).strict(),
  z.object({
    ...commandEnvelope,
    commandType: z.literal("SellAsset"),
    payload: z.object({ assetId: identifier, quantity }).strict(),
  }).strict(),
  z.object({
    ...commandEnvelope,
    commandType: z.literal("Travel"),
    payload: z.object({
      destinationLocationId: identifier,
      mode: z.enum(["walk", "chopper", "whip"]),
    }).strict(),
  }).strict(),
  z.object({
    ...commandEnvelope,
    commandType: z.literal("DepositStash"),
    payload: z.object({ assetId: identifier, quantity }).strict(),
  }).strict(),
  z.object({
    ...commandEnvelope,
    commandType: z.literal("WithdrawStash"),
    payload: z.object({ locationId: identifier, assetId: identifier, quantity }).strict(),
  }).strict(),
  z.object({
    ...commandEnvelope,
    commandType: z.literal("AcceptClient"),
    payload: z.object({ clientId: identifier }).strict(),
  }).strict(),
  z.object({
    ...commandEnvelope,
    commandType: z.literal("UsePlug"),
    payload: z.object({ assetId: identifier, locationId: identifier }).strict(),
  }).strict(),
  z.object({
    ...commandEnvelope,
    commandType: z.literal("EndDay"),
    payload: z.object({}).strict(),
  }).strict(),
  z.object({
    ...commandEnvelope,
    commandType: z.literal("EndRun"),
    payload: z.object({}).strict(),
  }).strict(),
]);

export type RunCommandBody = z.infer<typeof runCommandBodySchema>;

export function toEconomyCommand(body: RunCommandBody): EconomyCommand {
  const base = { commandId: body.commandId, expectedStateVersion: body.expectedStateVersion };
  switch (body.commandType) {
    case "BuyAsset": return { ...base, type: body.commandType, ...body.payload };
    case "SellAsset": return { ...base, type: body.commandType, ...body.payload };
    case "Travel": return { ...base, type: body.commandType, ...body.payload };
    case "DepositStash": return { ...base, type: body.commandType, ...body.payload };
    case "WithdrawStash": return { ...base, type: body.commandType, ...body.payload };
    case "AcceptClient": return { ...base, type: body.commandType, ...body.payload };
    case "UsePlug": return { ...base, type: body.commandType, ...body.payload };
    case "EndDay": return { ...base, type: body.commandType };
    case "EndRun": return { ...base, type: body.commandType };
  }
}
