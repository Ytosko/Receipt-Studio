import type { Shop } from "./schemas.js";

export function pointsForSpend(amount: number, loyalty: Shop["loyalty"]) {
  if (!loyalty.enabled || amount <= 0) return 0;
  return Math.floor(amount / loyalty.spendAmount) * loyalty.pointsAwarded;
}

export function redemptionValue(points: number, loyalty: Shop["loyalty"]) {
  if (!loyalty.enabled || points <= 0) return 0;
  return Math.floor(points / loyalty.redemptionPoints) * loyalty.redemptionValue;
}

export function maxRedeemablePoints(balance: number, saleTotal: number, loyalty: Shop["loyalty"]) {
  if (!loyalty.enabled || balance <= 0 || saleTotal <= 0) return 0;
  const groups = Math.floor(saleTotal / loyalty.redemptionValue);
  return Math.min(balance, groups * loyalty.redemptionPoints);
}
