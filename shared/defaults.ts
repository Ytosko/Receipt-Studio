import type { ReceiptBlock, ReceiptTemplate } from "./schemas.js";
const now = () => new Date().toISOString();
const b = (type: ReceiptBlock["type"], rest: Partial<ReceiptBlock> = {}): ReceiptBlock => ({
  id: crypto.randomUUID(), type, align: "left", bold: false, underline: false, size: "normal",
  spacingTop: 0, spacingBottom: 0, visibleWhen: "always", settings: {}, ...rest
});
export const starterTemplate = (shopId: string): ReceiptTemplate => ({
  id: crypto.randomUUID(), shopId, name: "Classic 80 mm", printableWidthMm: 72, createdAt: now(), updatedAt: now(),
  blocks: [
    b("logo", { align: "center", settings: { widthMm: 40 } }), b("shopName", { align: "center", bold: true, size: "xlarge" }),
    b("shopContact", { align: "center" }), b("divider"), b("metadata"), b("customer", { visibleWhen: "customer" }),
    b("items"), b("divider"), b("totals"), b("payment"), b("qrcode", { align: "center", settings: { moduleSize: 5 } }),
    b("footer", { text: "Thank you!", align: "center", bold: true }), b("spacer", { settings: { lines: 2 } })
  ]
});
