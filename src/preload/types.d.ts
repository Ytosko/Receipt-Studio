import type { Collection } from "../../shared/schemas";
declare global {
  interface Window {
    receiptStudio: {
      load<T = unknown>(collection: Collection): Promise<T>;
      save(collection: Collection, data: unknown): Promise<unknown>;
      upsert(
        collection: Exclude<Collection, "settings">,
        entity: unknown,
      ): Promise<unknown>;
      remove(
        collection: Exclude<Collection, "settings">,
        id: string,
      ): Promise<boolean>;
      completeSale(sale: unknown, print: boolean): Promise<any>;
      refundSale(request: unknown): Promise<any>;
      replaceSale(request: unknown): Promise<any>;
      printSale(saleId: string): Promise<any>;
      testPrinter(printerId: string): Promise<any>;
      printTemplateTest(printerId: string, templateId: string): Promise<any>;
      printProductLabel(
        productId: string,
        labelId: string,
        printerId: string,
        copies?: number,
      ): Promise<any>;
      printLabelTest(labelId: string, printerId: string): Promise<any>;
      listPrinters(): Promise<Array<{ name: string; displayName: string }>>;
      exportPdf(saleId: string): Promise<any>;
      exportBackup(): Promise<any>;
      importBackup(): Promise<any>;
      openLogs(): Promise<void>;
      diagnostics(): Promise<void>;
      chooseShopLogo(): Promise<{ canceled: boolean; assetId?: string }>;
      readShopLogo(assetId: string): Promise<string>;
    };
  }
}
export {};
