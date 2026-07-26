import { getReferralData, saveReferralData } from "../referral";

const DAILY_DRIP_RATE = 0.003;
const COMPLETION_BONUS_RATE = 0.05;
const GIFT_TVL_DRIP_RATE = 0.01;

export function processDailyReferralDrip(
  crewTelegramId: number,
  grossYield: number
): void {
  const crewData = getReferralData(crewTelegramId);
  if (!crewData.referredBy || grossYield <= 0) return;

  const drip = grossYield * DAILY_DRIP_RATE;
  const referrerId = parseInt(crewData.referredBy, 10);
  const referrerData = getReferralData(referrerId);
  referrerData.pendingDrip += drip;
  referrerData.totalEarnings += drip;
  saveReferralData(referrerId, referrerData);
}

export function processGiftTvlDrip(crewTelegramId: number, tvlAmount: number): void {
  const crewData = getReferralData(crewTelegramId);
  if (!crewData.referredBy || tvlAmount <= 0) return;

  const drip = tvlAmount * GIFT_TVL_DRIP_RATE;
  const referrerId = parseInt(crewData.referredBy, 10);
  const referrerData = getReferralData(referrerId);
  referrerData.pendingDrip += drip;
  referrerData.totalEarnings += drip;
  saveReferralData(referrerId, referrerData);
}

export function processCompletionBonus(crewTelegramId: number, protectedReserves: number): number {
  const crewData = getReferralData(crewTelegramId);
  if (!crewData.referredBy) return 0;

  const bonus = protectedReserves * COMPLETION_BONUS_RATE;
  const referrerId = parseInt(crewData.referredBy, 10);
  const referrerData = getReferralData(referrerId);
  referrerData.pendingDrip += bonus;
  referrerData.totalEarnings += bonus;
  saveReferralData(referrerId, referrerData);
  return bonus;
}