import { formatMoney } from "./money.js";
import type { LabelElement, LabelTemplate, Product, Shop } from "./schemas.js";

export const sampleLabelProduct: Product = {
  id: "sample-product",
  shopIds: [],
  name: "House Blend Coffee",
  sku: "COFFEE-001",
  barcode: "123456789012",
  category: "Coffee",
  price: 45000,
  taxRate: 0,
  stock: 24,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

export function productLabelValue(element: LabelElement, product: Product, shop?: Shop) {
  switch (element.binding) {
    case "productName": return product.name;
    case "productPrice": return formatMoney(product.price, shop?.currency || "BDT", shop?.locale || "en-BD");
    case "productSku": return product.sku ? `SKU: ${product.sku}` : "SKU: —";
    case "productBarcode": return product.barcode || product.sku || product.id;
    case "productStock": return `Stock: ${product.stock}`;
    case "productQr":
      return JSON.stringify({
        id: product.id,
        name: product.name,
        sku: product.sku || undefined,
        barcode: product.barcode || undefined,
        price: product.price,
        currency: shop?.currency || "BDT"
      });
    default: return element.text;
  }
}

export function bindProductLabel(template: LabelTemplate, product: Product, shop?: Shop): LabelTemplate {
  return {
    ...template,
    elements: template.elements.map(element => ({
      ...element,
      text: productLabelValue(element, product, shop)
    }))
  };
}

export function productPriceTagElements(): LabelElement[] {
  return [
    { id: crypto.randomUUID(), type: "text", x: 2, y: 2, width: 34, height: 5, text: "", binding: "productName", fontSize: 14, bold: true, rotation: 0, barcodeFormat: "code128" },
    { id: crypto.randomUUID(), type: "text", x: 2, y: 7.5, width: 28, height: 5, text: "", binding: "productPrice", fontSize: 16, bold: true, rotation: 0, barcodeFormat: "code128" },
    { id: crypto.randomUUID(), type: "line", x: 2, y: 13, width: 34, height: 0.5, text: "", fontSize: 12, bold: false, rotation: 0, barcodeFormat: "code128" },
    { id: crypto.randomUUID(), type: "barcode", x: 2, y: 15, width: 34, height: 8, text: "", binding: "productBarcode", fontSize: 10, bold: false, rotation: 0, barcodeFormat: "code128" },
    { id: crypto.randomUUID(), type: "qrcode", x: 38, y: 2, width: 10, height: 10, text: "", binding: "productQr", fontSize: 10, bold: false, rotation: 0, barcodeFormat: "code128" },
    { id: crypto.randomUUID(), type: "text", x: 38, y: 14, width: 10, height: 4, text: "", binding: "productStock", fontSize: 8, bold: false, rotation: 0, barcodeFormat: "code128" }
  ];
}
