import { formatMoney } from "./money.js";
import type { ReceiptBlock, Sale, Shop } from "./schemas.js";

export function receiptMetadata(sale: Partial<Sale>, shop: Shop) {
  const createdAt = sale.createdAt ? new Date(sale.createdAt) : new Date();
  const kind = sale.transactionType === "refund" ? "Refund" : sale.transactionType === "replacement" ? "Replacement" : "Receipt";
  return {
    receipt: `${kind} ${sale.receiptNumber || "DRAFT"}`,
    dateTime: createdAt.toLocaleString(shop.locale)
  };
}

export function shopContactLines(shop: Shop) {
  return [...shop.addressLines, shop.phone, shop.email].filter(Boolean) as string[];
}

export function receiptPaymentText(sale: Partial<Sale>, shop: Shop) {
  const money = (value?: number) => formatMoney(value ?? 0, shop.currency, shop.locale);
  return [
    `Paid by ${(sale.paymentMethod || "cash").toUpperCase()}`,
    ...(sale.amountPaid !== undefined
      ? [`Amount paid: ${money(sale.amountPaid)}`, `Change: ${money(sale.changeDue)}`]
      : [])
  ].join("\n");
}

export function receiptLoyaltyText(sale: Partial<Sale>) {
  return [
    ...(sale.pointsEarned ? [`Points earned: ${sale.pointsEarned}`] : []),
    ...(sale.pointsRedeemed ? [`Points redeemed: ${sale.pointsRedeemed}`] : []),
    ...(sale.pointsReversed ? [`Points reversed: ${sale.pointsReversed}`] : []),
    ...(sale.pointsBalanceAfter !== undefined ? [`Points balance: ${sale.pointsBalanceAfter}`] : [])
  ].join("\n");
}

export function receiptQrValue(block: ReceiptBlock, sale: Partial<Sale>, shop: Shop) {
  const money = (value?: number) => formatMoney(value ?? 0, shop.currency, shop.locale);
  const receipt = sale.receiptNumber || "DRAFT";
  const mode = String(block.settings.content || "shopReceiptTotal");
  if (mode === "receipt") return receipt;
  if (mode === "receiptTotal") return `Receipt: ${receipt}\nTotal: ${money(sale.total)}`;
  if (mode === "custom") {
    return (block.text || "{{receipt.number}}")
      .replace(/\{\{receipt\.number\}\}/g, receipt)
      .replace(/\{\{sale\.total\}\}/g, money(sale.total))
      .replace(/\{\{shop\.name\}\}/g, shop.name);
  }
  return `Shop: ${shop.name}\nReceipt: ${receipt}\nTotal: ${money(sale.total)}`;
}
