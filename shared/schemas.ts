import { z } from "zod";

const id = z.string().min(1);
const date = z.string().min(1);
export const shopSchema = z.object({
  id,
  name: z.string().min(1),
  legalName: z.string().optional(),
  addressLines: z.array(z.string()),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  taxId: z.string().optional(),
  currency: z.string().length(3),
  locale: z.string().min(2),
  logoAssetId: z.string().optional(),
  defaultTemplateId: z.string().optional(),
  defaultPrinterId: z.string().optional(),
  receiptPrefix: z.string().optional(),
  nextReceiptNumber: z.number().int().positive(),
  archived: z.boolean().default(false),
  loyalty: z
    .object({
      enabled: z.boolean().default(false),
      spendAmount: z.number().int().positive().default(50000),
      pointsAwarded: z.number().int().positive().default(1),
      redemptionPoints: z.number().int().positive().default(1),
      redemptionValue: z.number().int().positive().default(100),
    })
    .default({
      enabled: false,
      spendAmount: 50000,
      pointsAwarded: 1,
      redemptionPoints: 1,
      redemptionValue: 100,
    }),
  createdAt: date,
  updatedAt: date,
});
export const productSchema = z.object({
  id,
  shopIds: z.array(id),
  name: z.string().min(1),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category: z.string().optional(),
  price: z.number().int().nonnegative(),
  taxRate: z.number().min(0).max(100).optional(),
  stock: z.number().int().nonnegative().default(0),
  description: z.string().optional(),
  isActive: z.boolean(),
  createdAt: date,
  updatedAt: date,
});
export const customerSchema = z.object({
  id,
  name: z.string().default(""),
  phone: z.string().trim().min(1, "Phone number is required"),
  email: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  pointsBalance: z.number().int().nonnegative().default(0),
  createdAt: date,
  updatedAt: date,
});
export const saleItemSchema = z.object({
  id,
  productId: z.string().optional(),
  name: z.string().min(1),
  sku: z.string().optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().int().nonnegative(),
  discount: z.number().int().nonnegative(),
  taxRate: z.number().min(0),
  lineSubtotal: z.number().int(),
  lineTax: z.number().int(),
  lineTotal: z.number().int(),
});
export const saleSchema = z.object({
  id,
  shopId: id,
  templateId: id,
  printerId: z.string().optional(),
  receiptNumber: z.string(),
  customerId: z.string().optional(),
  customerSnapshot: z
    .object({
      name: z.string(),
      phone: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
    })
    .optional(),
  items: z.array(saleItemSchema).min(1),
  subtotal: z.number().int(),
  discount: z.number().int(),
  tax: z.number().int(),
  total: z.number().int(),
  paymentMethod: z.string().min(1),
  amountPaid: z.number().int().optional(),
  changeDue: z.number().int().optional(),
  note: z.string().optional(),
  status: z.enum(["completed", "voided"]),
  transactionType: z.enum(["sale", "refund", "replacement"]).default("sale"),
  originalSaleId: z.string().optional(),
  returnedItems: z
    .array(
      z.object({
        saleItemId: id,
        productId: z.string().optional(),
        name: z.string(),
        quantity: z.number().positive(),
        amount: z.number().int(),
      }),
    )
    .default([]),
  returnReason: z.string().optional(),
  restocked: z.boolean().optional(),
  pointsEarned: z.number().int().nonnegative().default(0),
  pointsRedeemed: z.number().int().nonnegative().default(0),
  pointsReversed: z.number().int().nonnegative().default(0),
  pointDiscount: z.number().int().nonnegative().default(0),
  pointsBalanceAfter: z.number().int().nonnegative().optional(),
  printStatus: z
    .enum(["not_printed", "queued", "printing", "succeeded", "failed"])
    .default("not_printed"),
  createdAt: date,
});
export const printerSchema = z.object({
  id,
  name: z.string().min(1),
  connectionType: z.enum(["network", "system"]),
  printerType: z.enum(["receipt", "label"]).default("receipt"),
  network: z
    .object({
      host: z.string().min(1),
      port: z.number().int().min(1).max(65535),
      timeoutMs: z.number().int().min(100),
    })
    .optional(),
  system: z.object({ deviceName: z.string() }).optional(),
  paperWidthMm: z.number().positive(),
  paperHeightMm: z.number().positive().optional(),
  printableWidthMm: z.number().positive(),
  characterWidth: z.number().int().min(16).max(100),
  encoding: z.string(),
  cutAfterPrint: z.boolean(),
  openDrawerAfterPrint: z.boolean(),
  feedLinesAfterPrint: z.number().int().min(0).max(20),
  dpi: z.union([z.literal(203), z.literal(300), z.literal(600)]).default(203),
  orientation: z.enum(["portrait", "landscape"]).default("portrait"),
  commandLanguage: z
    .enum(["escpos", "system", "zpl", "tspl"])
    .default("escpos"),
  exactLabelSize: z.boolean().default(true),
  labelGapMm: z.number().min(0).default(3),
  printSpeed: z.number().positive().default(4),
  darkness: z.number().min(0).max(30).default(8),
  createdAt: date,
  updatedAt: date,
});
export const blockTypeSchema = z.enum([
  "logo",
  "shopName",
  "shopContact",
  "customText",
  "metadata",
  "customer",
  "items",
  "totals",
  "payment",
  "loyalty",
  "divider",
  "spacer",
  "barcode",
  "qrcode",
  "footer",
  "terms",
  "datetime",
  "receiptNumber",
  "labelValue",
]);
export const blockSchema = z.object({
  id,
  type: blockTypeSchema,
  text: z.string().optional(),
  label: z.string().optional(),
  align: z.enum(["left", "center", "right"]).default("left"),
  bold: z.boolean().default(false),
  underline: z.boolean().default(false),
  size: z.enum(["small", "normal", "large", "xlarge"]).default("normal"),
  spacingTop: z.number().int().min(0).default(0),
  spacingBottom: z.number().int().min(0).default(0),
  visibleWhen: z
    .enum(["always", "customer", "tax", "discount", "note", "payment"])
    .default("always"),
  settings: z.record(z.string(), z.unknown()).default({}),
});
export const templateSchema = z.object({
  id,
  shopId: id,
  name: z.string().min(1),
  printerId: z.string().optional(),
  printableWidthMm: z.number().positive(),
  blocks: z.array(blockSchema),
  createdAt: date,
  updatedAt: date,
});
export const settingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).default("light"),
  setupComplete: z.boolean().default(false),
  activeShopId: z.string().optional(),
  paymentMethods: z
    .array(z.string().min(1))
    .min(1)
    .default(["Cash", "Card", "Mobile", "Other"]),
});

export const labelElementSchema = z.object({
  id,
  type: z.enum(["text", "barcode", "qrcode", "image", "line", "box"]),
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().positive(),
  height: z.number().positive(),
  text: z.string().default(""),
  fontSize: z.number().positive().default(12),
  bold: z.boolean().default(false),
  align: z.enum(["left", "center", "right"]).default("left"),
  rotation: z
    .union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)])
    .default(0),
  barcodeFormat: z
    .enum(["code128", "code39", "ean13", "upca"])
    .default("code128"),
  binding: z
    .enum([
      "productName",
      "productPrice",
      "productSku",
      "productBarcode",
      "productStock",
      "productQr",
    ])
    .optional(),
});
export const labelTemplateSchema = z.object({
  id,
  name: z.string().min(1),
  shopId: z.string().optional(),
  printerId: z.string().optional(),
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  dpi: z.union([z.literal(203), z.literal(300), z.literal(600)]),
  orientation: z.enum(["portrait", "landscape"]),
  elements: z.array(labelElementSchema),
  createdAt: date,
  updatedAt: date,
  savedAt: date.optional(),
});
export const collections = [
  "shops",
  "products",
  "customers",
  "sales",
  "templates",
  "labels",
  "printers",
  "settings",
] as const;
export type Collection = (typeof collections)[number];
export type Shop = z.infer<typeof shopSchema>;
export type Product = z.infer<typeof productSchema>;
export type Customer = z.infer<typeof customerSchema>;
export type Sale = z.infer<typeof saleSchema>;
export type SaleItem = z.infer<typeof saleItemSchema>;
export type PrinterProfile = z.infer<typeof printerSchema>;
export type ReceiptTemplate = z.infer<typeof templateSchema>;
export type ReceiptBlock = z.infer<typeof blockSchema>;
export type LabelElement = z.infer<typeof labelElementSchema>;
export type LabelTemplate = z.infer<typeof labelTemplateSchema>;
export type Settings = z.infer<typeof settingsSchema>;
