import type { PrinterProfile, ReceiptBlock, ReceiptTemplate } from "./schemas.js";
const now = () => new Date().toISOString();
export const defaultPrinter = (): PrinterProfile => ({
  id: crypto.randomUUID(), name: "Rongta RP336UV", connectionType: "network",
  printerType: "receipt",
  network: { host: "192.168.68.68", port: 9100, timeoutMs: 5000 }, paperWidthMm: 80,
  printableWidthMm: 72, characterWidth: 48, encoding: "CP437", cutAfterPrint: true,
  openDrawerAfterPrint: false, feedLinesAfterPrint: 4, createdAt: now(), updatedAt: now()
  ,dpi:203,orientation:"portrait",commandLanguage:"escpos",labelGapMm:3,printSpeed:4,darkness:8
});
const b = (type: ReceiptBlock["type"], rest: Partial<ReceiptBlock> = {}): ReceiptBlock => ({
  id: crypto.randomUUID(), type, align: "left", bold: false, underline: false, size: "normal",
  spacingTop: 0, spacingBottom: 0, visibleWhen: "always", settings: {}, ...rest
});
export const starterTemplate = (shopId: string): ReceiptTemplate => ({
  id: crypto.randomUUID(), shopId, name: "Classic 80 mm", printableWidthMm: 72, createdAt: now(), updatedAt: now(),
  blocks: [
    b("logo", { align: "center" }), b("shopName", { align: "center", bold: true, size: "xlarge" }),
    b("shopContact", { align: "center" }), b("divider"), b("metadata"), b("customer", { visibleWhen: "customer" }),
    b("items"), b("divider"), b("totals"), b("payment"), b("qrcode", { align: "center" }),
    b("footer", { text: "Thank you!", align: "center", bold: true }), b("spacer", { settings: { lines: 2 } })
  ]
});
