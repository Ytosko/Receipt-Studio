import { describe, expect, it } from "vitest";
import { maxRedeemablePoints, pointsForSpend, redemptionValue } from "../../shared/loyalty";

const loyalty={enabled:true,spendAmount:50000,pointsAwarded:1,redemptionPoints:2,redemptionValue:1000};

describe("loyalty calculations",()=>{
  it("awards only complete earning groups",()=>{
    expect(pointsForSpend(120000,loyalty)).toBe(2);
    expect(pointsForSpend(49999,loyalty)).toBe(0);
  });
  it("converts only complete redemption groups",()=>{
    expect(redemptionValue(5,loyalty)).toBe(2000);
  });
  it("caps redemption by balance and sale value",()=>{
    expect(maxRedeemablePoints(20,2500,loyalty)).toBe(4);
  });
});
