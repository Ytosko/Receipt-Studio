import { describe, expect, it } from "vitest";
import { formatMoney, lineTotals, roundMoney, saleTotals } from "../../shared/money";
import { createUniqueReceiptNumber } from "../../shared/receiptNumber";
describe("integer money arithmetic",()=>{
 it("rounds deterministically",()=>expect(roundMoney(10.5)).toBe(11));
 it("calculates quantity, discount and tax",()=>expect(lineTotals(3,199,50,7.5)).toEqual({lineSubtotal:597,lineTax:41,lineTotal:588}));
 it("aggregates a sale without floating point drift",()=>expect(saleTotals([{lineSubtotal:597,lineTax:41},{lineSubtotal:100,lineTax:0}],25)).toEqual({subtotal:697,tax:41,total:713}));
 it("never produces a negative total",()=>expect(saleTotals([{lineSubtotal:100,lineTax:0}],200).total).toBe(0));
 it("uses printer-safe regular spacing for BDT",()=>{const value=formatMoney(125050,"BDT","en-US");expect(value).toContain("BDT 1,250.50");expect(value).not.toMatch(/[\u00a0\u202f]/)});
 it("creates a random receipt number that has never been used",()=>{const ids=["same","fresh"];let index=0;const value=createUniqueReceiptNumber(["R-SAME"],"R",()=>ids[index++]);expect(value).toBe("R-FRESH")});
});
