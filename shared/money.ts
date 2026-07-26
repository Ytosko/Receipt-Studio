export const roundMoney = (value: number) => Math.round(value);
export const lineTotals = (quantity: number, unitPrice: number, discount = 0, taxRate = 0) => {
  const subtotal = roundMoney(quantity * unitPrice);
  const taxable = Math.max(0, subtotal - discount);
  const tax = roundMoney(taxable * taxRate / 100);
  return { lineSubtotal: subtotal, lineTax: tax, lineTotal: taxable + tax };
};
export const saleTotals = (items: Array<{lineSubtotal:number;lineTax:number}>, discount = 0) => {
  const subtotal = items.reduce((sum, i) => sum + i.lineSubtotal, 0);
  const tax = items.reduce((sum, i) => sum + i.lineTax, 0);
  return { subtotal, tax, total: Math.max(0, subtotal - discount + tax) };
};
export const formatMoney = (minor: number, currency = "USD", locale = "en-US") =>
  new Intl.NumberFormat(currency === "BDT" ? "en-US" : locale, { style: "currency", currency, currencyDisplay: currency === "BDT" ? "code" : "symbol" })
    .format(minor / 100)
    .replace(/[\u00a0\u202f]/g, " ");

export const normalizeMoneyInput = (input: string) => {
  const cleaned = input.replace(/,/g, "").replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot < 0) return cleaned;
  const whole = cleaned.slice(0, dot) || "0";
  const decimal = cleaned.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  return `${whole}.${decimal}`;
};
