import { app, dialog } from "electron";
import { mkdir, readFile, rename, writeFile, copyFile, readdir, rm, cp } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { collections, customerSchema, labelTemplateSchema, printerSchema, productSchema, saleSchema, settingsSchema, shopSchema, templateSchema, type Collection } from "../../../shared/schemas.js";
import { defaultPrinter } from "../../../shared/defaults.js";
import { createUniqueReceiptNumber } from "../../../shared/receiptNumber.js";

const schemas: Record<Collection, z.ZodType> = {
  shops: z.array(shopSchema), products: z.array(productSchema), customers: z.array(customerSchema),
  sales: z.array(saleSchema), templates: z.array(templateSchema), labels:z.array(labelTemplateSchema), printers: z.array(printerSchema), settings: settingsSchema
};
const defaults: Record<Collection, unknown> = {
  shops: [], products: [], customers: [], sales: [], templates: [], labels:[], printers: [], settings: { theme: "light", setupComplete: false, paymentMethods: ["Cash","Card","Mobile","Other"] }
};
export class Repository {
  readonly root = path.join(app.getPath("userData"), "data");
  readonly assets = path.join(app.getPath("userData"), "assets");
  readonly backups = path.join(app.getPath("userData"), "backups");
  async init() {
    await mkdir(this.root, { recursive: true }); await mkdir(this.backups, { recursive: true });
    await mkdir(path.join(this.assets, "shop-logos"), { recursive: true });
    for (const name of collections) await this.load(name);
    const printers = await this.load("printers") as unknown[];
    if (!printers.length) await this.save("printers", [defaultPrinter()]);
  }
  private file(name: Collection) { return path.join(this.root, `${name}.json`); }
  async load(name: Collection): Promise<unknown> {
    const file = this.file(name);
    try {
      const parsed = JSON.parse(await readFile(file, "utf8"));
      return schemas[name].parse(parsed);
    } catch (error: any) {
      if (error?.code !== "ENOENT") {
        const backup = path.join(this.backups, `corrupt-${name}-${Date.now()}.json`);
        await copyFile(file, backup).catch(() => undefined);
      }
      await this.save(name, defaults[name]);
      return structuredClone(defaults[name]);
    }
  }
  async save(name: Collection, data: unknown) {
    const value = schemas[name].parse(data);
    const target = this.file(name), temp = `${target}.${process.pid}.tmp`;
    await writeFile(temp, JSON.stringify(value, null, 2), "utf8");
    JSON.parse(await readFile(temp, "utf8"));
    await rename(temp, target);
    return value;
  }
  async upsert(name: Exclude<Collection,"settings">, entity: any) {
    const list = await this.load(name) as any[];
    const index = list.findIndex(item => item.id === entity.id);
    if (index >= 0) list[index] = entity; else list.push(entity);
    await this.save(name, list); return entity;
  }
  async remove(name: Exclude<Collection,"settings">, id: string) {
    const list = await this.load(name) as any[];
    await this.save(name, list.filter(item => item.id !== id)); return true;
  }
  async reserveReceipt(shopId: string) {
    const shops = await this.load("shops") as any[];
    const shop = shops.find(s => s.id === shopId);
    if (!shop) throw new Error("Shop not found");
    const sales = await this.load("sales") as Array<{receiptNumber:string}>;
    const value = createUniqueReceiptNumber(sales.map(s => s.receiptNumber), shop.receiptPrefix || "R");
    shop.nextReceiptNumber += 1; shop.updatedAt = new Date().toISOString();
    await this.save("shops", shops); return value;
  }
  async exportBackup() {
    const choice = await dialog.showSaveDialog({ title: "Export Receipt Studio backup", defaultPath: `receipt-studio-backup-${new Date().toISOString().slice(0,10)}` });
    if (choice.canceled || !choice.filePath) return { canceled: true };
    await cp(this.root, choice.filePath, { recursive: true });
    await cp(this.assets, path.join(choice.filePath, "assets"), { recursive: true });
    return { canceled: false, path: choice.filePath };
  }
  async importBackup() {
    const choice = await dialog.showOpenDialog({ title: "Import Receipt Studio backup", properties: ["openDirectory"] });
    if (choice.canceled) return { canceled: true };
    const source = choice.filePaths[0];
    for (const name of collections) {
      const raw = JSON.parse(await readFile(path.join(source, `${name}.json`), "utf8"));
      schemas[name].parse(raw);
    }
    await this.rotateBackup();
    for (const name of collections) await copyFile(path.join(source, `${name}.json`), this.file(name));
    await cp(path.join(source, "assets"), this.assets, { recursive: true }).catch(() => undefined);
    return { canceled: false };
  }
  async rotateBackup() {
    const dest = path.join(this.backups, `auto-${Date.now()}`);
    await cp(this.root, dest, { recursive: true });
    const entries = (await readdir(this.backups, { withFileTypes: true })).filter(e => e.isDirectory() && e.name.startsWith("auto-")).sort((a,b) => b.name.localeCompare(a.name));
    for (const old of entries.slice(10)) await rm(path.join(this.backups, old.name), { recursive: true, force: true });
  }
  async chooseShopLogo() {
    const choice = await dialog.showOpenDialog({
      title: "Choose shop logo",
      properties: ["openFile"],
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }]
    });
    if (choice.canceled || !choice.filePaths[0]) return { canceled: true as const };
    const extension = path.extname(choice.filePaths[0]).toLowerCase();
    const assetId = `${crypto.randomUUID()}${extension}`;
    await copyFile(choice.filePaths[0], path.join(this.assets, "shop-logos", assetId));
    return { canceled: false as const, assetId };
  }
  async readShopLogo(assetId: string) {
    const file = this.shopLogoPath(assetId);
    const extension = path.extname(assetId).toLowerCase();
    const mime = extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg";
    const data = await readFile(file);
    return `data:${mime};base64,${data.toString("base64")}`;
  }
  shopLogoPath(assetId: string) {
    if (!/^[a-f0-9-]+\.(png|jpe?g|webp)$/i.test(assetId)) throw new Error("Invalid logo asset");
    return path.join(this.assets, "shop-logos", assetId);
  }
}
