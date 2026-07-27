import { describe, expect, it } from "vitest";
import { labelToTspl, labelToZpl } from "../../src/main/printing/label";
import type { LabelTemplate, PrinterProfile } from "../../shared/schemas";
const label: LabelTemplate = {
  id: "l",
  name: "4x6",
  widthMm: 101.6,
  heightMm: 152.4,
  dpi: 203,
  orientation: "portrait",
  createdAt: "x",
  updatedAt: "x",
  elements: [
    {
      id: "t",
      type: "text",
      x: 5,
      y: 5,
      width: 80,
      height: 10,
      text: "Shipping Label",
      fontSize: 16,
      bold: true,
      align: "center",
      rotation: 0,
      barcodeFormat: "code128",
    },
    {
      id: "b",
      type: "barcode",
      x: 5,
      y: 20,
      width: 80,
      height: 25,
      text: "ABC123",
      fontSize: 12,
      bold: false,
      align: "left",
      rotation: 0,
      barcodeFormat: "code128",
    },
    {
      id: "q",
      type: "qrcode",
      x: 5,
      y: 50,
      width: 30,
      height: 30,
      text: "ORDER-123",
      fontSize: 12,
      bold: false,
      align: "left",
      rotation: 0,
      barcodeFormat: "code128",
    },
  ],
};
const printer: PrinterProfile = {
  id: "p",
  name: "Label",
  printerType: "label",
  connectionType: "network",
  network: { host: "127.0.0.1", port: 9100, timeoutMs: 500 },
  paperWidthMm: 101.6,
  paperHeightMm: 152.4,
  printableWidthMm: 101.6,
  characterWidth: 48,
  encoding: "CP437",
  cutAfterPrint: false,
  openDrawerAfterPrint: false,
  feedLinesAfterPrint: 0,
  dpi: 203,
  orientation: "portrait",
  commandLanguage: "zpl",
  exactLabelSize: true,
  labelGapMm: 3,
  printSpeed: 4,
  darkness: 8,
  createdAt: "x",
  updatedAt: "x",
};
describe("label printer languages", () => {
  it("generates sized ZPL with centered text, barcode, QR, and copy commands", () => {
    const value = labelToZpl(label, printer, 4);
    expect(value).toContain("^PW812");
    expect(value).toContain("^FB639,1,0,C,0");
    expect(value).toContain("^BCN");
    expect(value).toContain("^BQN");
    expect(value).toContain("^PQ4");
    expect(value).toContain("^XZ");
  });
  it("generates TSPL with custom metric size, centered text, and copies", () => {
    const value = labelToTspl(
      label,
      { ...printer, commandLanguage: "tspl" },
      4,
    );
    expect(value).toContain("SIZE 101.6 mm,152.4 mm");
    expect(value).toContain('BLOCK 40,40,639,80,"0",0,1,1,0,1');
    expect(value).toContain("BARCODE");
    expect(value).toContain("QRCODE");
    expect(value).toContain("PRINT 1,4");
  });
});
