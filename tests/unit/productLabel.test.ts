import { describe, expect, it } from "vitest";
import { bindProductLabel, findAvailableLabelPosition, productPriceTagElements, sampleLabelProduct } from "../../shared/productLabel";
import type { LabelElement, LabelTemplate, Shop } from "../../shared/schemas";

const shop: Shop = {
  id: "shop-1",
  name: "Sample Shop",
  addressLines: [],
  currency: "BDT",
  locale: "en-BD",
  nextReceiptNumber: 1,
  archived: false,
  loyalty: { enabled: false, spendAmount: 50000, pointsAwarded: 1, redemptionPoints: 1, redemptionValue: 100 },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

const template: LabelTemplate = {
  id: "label-1",
  name: "Product tag",
  shopId: shop.id,
  widthMm: 50,
  heightMm: 25,
  dpi: 203,
  orientation: "portrait",
  elements: productPriceTagElements(),
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

describe("product label binding", () => {
  it("fills product fields without changing the saved template", () => {
    const bound = bindProductLabel(template, sampleLabelProduct, shop);
    expect(bound.elements.find(element => element.binding === "productName")?.text).toBe("House Blend Coffee");
    expect(bound.elements.find(element => element.binding === "productPrice")?.text).toBe("BDT 450.00");
    expect(bound.elements.find(element => element.binding === "productBarcode")?.text).toBe("123456789012");
    expect(bound.elements.find(element => element.binding === "productStock")?.text).toBe("Stock: 24");
    expect(template.elements.find(element => element.binding === "productName")?.text).toBe("");
  });

  it("encodes useful product data in the QR value", () => {
    const bound = bindProductLabel(template, sampleLabelProduct, shop);
    const qr = JSON.parse(bound.elements.find(element => element.binding === "productQr")?.text || "{}");
    expect(qr).toMatchObject({ id: "sample-product", name: "House Blend Coffee", currency: "BDT" });
  });

  it("places sequential label fields without stacking them", () => {
    const first: LabelElement = {
      id: "first",
      type: "text",
      x: 2,
      y: 2,
      width: 34,
      height: 5,
      text: "",
      fontSize: 12,
      bold: false,
      align: "left",
      rotation: 0,
      barcodeFormat: "code128"
    };
    const second = findAvailableLabelPosition([first], 50, 25, 34, 5);
    expect(second.y).toBeGreaterThanOrEqual(first.y + first.height + 1);
  });
});
