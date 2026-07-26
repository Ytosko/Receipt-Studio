import { contextBridge, ipcRenderer } from "electron";
const invoke=(channel:string,payload?:unknown)=>ipcRenderer.invoke(channel,payload);
contextBridge.exposeInMainWorld("receiptStudio",{
  load:(collection:string)=>invoke("data:load",{collection}),
  save:(collection:string,data:unknown)=>invoke("data:save",{collection,data}),
  upsert:(collection:string,entity:unknown)=>invoke("data:upsert",{collection,entity}),
  remove:(collection:string,id:string)=>invoke("data:remove",{collection,id}),
  completeSale:(sale:unknown,print:boolean)=>invoke("sale:complete",{sale,print}),
  refundSale:(request:unknown)=>invoke("sale:refund",request),
  replaceSale:(request:unknown)=>invoke("sale:replace",request),
  printSale:(saleId:string)=>invoke("print:sale",{saleId}),
  testPrinter:(printerId:string)=>invoke("print:test",{printerId}),
  printTemplateTest:(printerId:string,templateId:string)=>invoke("print:template-test",{printerId,templateId}),
  printProductLabel:(productId:string,labelId:string,printerId:string)=>invoke("print:product-label",{productId,labelId,printerId}),
  printLabelTest:(labelId:string,printerId:string)=>invoke("print:label-test",{labelId,printerId}),
  listPrinters:()=>invoke("print:list"),
  exportPdf:(saleId:string)=>invoke("sale:pdf",{saleId}),
  exportBackup:()=>invoke("backup:export"),
  importBackup:()=>invoke("backup:import"),
  chooseShopLogo:()=>invoke("asset:choose-shop-logo"),
  readShopLogo:(assetId:string)=>invoke("asset:read-shop-logo",{assetId}),
  openLogs:()=>invoke("logs:open"),
  diagnostics:()=>invoke("diagnostics:copy")
});
