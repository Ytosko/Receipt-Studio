import { app, BrowserWindow, clipboard, dialog, ipcMain, nativeImage, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, appendFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { collections, labelTemplateSchema, printerSchema, productSchema, saleSchema, type LabelElement, type LabelTemplate, type PrinterProfile } from "../../shared/schemas.js";
import { bindProductLabel, sampleLabelProduct } from "../../shared/productLabel.js";
import { Repository } from "./storage/repository.js";
import { renderReceipt, linesToHtml } from "./receipt/render.js";
import { escPosBytes } from "./printing/escpos.js";
import { sendNetwork, testNetwork } from "./printing/printer.js";
import QRCode from "qrcode";
import bwipjs from "bwip-js/node";
import { labelToTspl, labelToZpl } from "./printing/label.js";
const dirname=path.dirname(fileURLToPath(import.meta.url));
if(process.env.RECEIPT_STUDIO_E2E==="1") app.setPath("userData",path.join(app.getPath("temp"),`receipt-studio-e2e-${process.pid}`));
const repo=new Repository();
const collection=z.enum(collections); const entityCollections=z.enum(["shops","products","customers","sales","templates","labels","printers"]);
const logs=()=>path.join(app.getPath("userData"),"logs");
async function log(message:string){await mkdir(logs(),{recursive:true});await appendFile(path.join(logs(),"receipt-studio.log"),`${new Date().toISOString()} ${message}\n`);}
function createWindow(){
  const win=new BrowserWindow({width:1500,height:950,minWidth:1180,minHeight:720,backgroundColor:"#f5f2ea",show:false,icon:path.join(dirname,"../../renderer/logo.png"),
    webPreferences:{preload:path.join(dirname,"../preload/preload.cjs"),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  win.webContents.setWindowOpenHandler(()=>({action:"deny"}));
  win.webContents.on("will-navigate",(event,url)=>{if(!url.startsWith("file:")&&!url.startsWith("http://localhost:5173"))event.preventDefault();});
  if(process.env.VITE_DEV_SERVER_URL) win.loadURL(process.env.VITE_DEV_SERVER_URL); else win.loadFile(path.join(dirname,"../../renderer/index.html"));
  win.once("ready-to-show",()=>win.show());
}
async function getContext(saleId:string){
  const sales=await repo.load("sales") as any[], sale=sales.find(s=>s.id===saleId); if(!sale)throw new Error("Sale not found");
  const shops=await repo.load("shops") as any[], shop=shops.find(s=>s.id===sale.shopId); if(!shop)throw new Error("Shop not found");
  const templates=await repo.load("templates") as any[], template=templates.find(t=>t.id===sale.templateId); if(!template)throw new Error("Template not found");
  return {sale,shop,template,lines:await renderWithAssets(template,sale,shop)};
}
async function renderWithAssets(template:any,sale:any,shop:any){
  let lines=renderReceipt(template,{sale,shop});
  lines=await Promise.all(lines.map(async line=>line.type==="qrcode"?{...line,dataUrl:await QRCode.toDataURL(line.value,{errorCorrectionLevel:"M",margin:1,width:320})}:line));
  if(shop.logoAssetId){
    const dataUrl=await repo.readShopLogo(shop.logoAssetId);
    const source=nativeImage.createFromPath(repo.shopLogoPath(shop.logoAssetId));
    if(!source.isEmpty()){
      const original=source.getSize(), width=Math.min(384,original.width), image=source.resize({width,quality:"best"});
      const size=image.getSize(), bitmap=image.toBitmap(), widthBytes=Math.ceil(size.width/8), raster=new Uint8Array(widthBytes*size.height);
      for(let y=0;y<size.height;y++)for(let x=0;x<size.width;x++){
        const offset=(y*size.width+x)*4, blue=bitmap[offset], green=bitmap[offset+1], red=bitmap[offset+2], alpha=bitmap[offset+3];
        if(alpha>30&&(red*0.299+green*0.587+blue*0.114)<170)raster[y*widthBytes+(x>>3)]|=0x80>>(x&7);
      }
      lines=lines.map(line=>line.type==="logo"?{type:"image" as const,data:raster,widthBytes,height:size.height,dataUrl}:line);
    }
  }
  return lines;
}
async function printLines(printer:any,lines:Awaited<ReturnType<typeof renderWithAssets>>){
  if(printer.connectionType==="network")return sendNetwork(printer,escPosBytes(lines,printer.characterWidth,printer.cutAfterPrint,printer.feedLinesAfterPrint,printer.openDrawerAfterPrint,printer.encoding));
  const win=new BrowserWindow({show:false,webPreferences:{sandbox:true}});
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`<style>@page{size:${printer.paperWidthMm}mm auto;margin:2mm}body{font:12px monospace;width:${printer.printableWidthMm}mm}</style>${linesToHtml(lines,printer.characterWidth)}`)}`);
  try{return await new Promise<any>((resolve,reject)=>win.webContents.print({silent:false,deviceName:printer.system?.deviceName,printBackground:true,margins:{marginType:"none"}},(ok,reason)=>ok?resolve({ok:true,message:"Print job sent"}):reject(new Error(reason))));}
  finally{win.close()}
}
const htmlEscape=(value:string)=>value.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
async function labelHtml(label:LabelTemplate){
  const elements=await Promise.all(label.elements.map(async(e:LabelElement)=>{
    const style=`position:absolute;left:${e.x}mm;top:${e.y}mm;width:${e.width}mm;height:${e.height}mm;transform:rotate(${e.rotation}deg);transform-origin:center;overflow:hidden;`;
    if(e.type==="text")return `<div style="${style}font-size:${e.fontSize}px;font-weight:${e.bold?700:400}">${htmlEscape(e.text)}</div>`;
    if(e.type==="qrcode"){const src=await QRCode.toDataURL(e.text||"Label",{margin:1,width:500});return `<img src="${src}" style="${style}object-fit:contain">`}
    if(e.type==="barcode"){try{const data=await bwipjs.toBuffer({bcid:e.barcodeFormat,text:e.text||"123456789012",scale:4,height:15,includetext:true,textxalign:"center"});return `<img src="data:image/png;base64,${data.toString("base64")}" style="${style}object-fit:fill">`}catch{return `<div style="${style}">Invalid barcode</div>`}}
    if(e.type==="box")return `<div style="${style}box-sizing:border-box;border:1px solid #000"></div>`;
    if(e.type==="line")return `<div style="${style}border-top:1px solid #000"></div>`;return "";
  }));
  return `<html><head><meta charset="utf-8"><style>@page{size:${label.widthMm}mm ${label.heightMm}mm;margin:0}html,body{margin:0;width:${label.widthMm}mm;height:${label.heightMm}mm;font-family:Arial,sans-serif}.sheet{position:relative;width:100%;height:100%}</style></head><body><div class="sheet">${elements.join("")}</div></body></html>`;
}
async function printLabelTemplate(label:LabelTemplate,printer:PrinterProfile){
  if(printer.printerType!=="label")throw new Error("Choose a label printer profile");
  if(printer.connectionType==="network"){
    const command=printer.commandLanguage==="tspl"?labelToTspl(label,printer):labelToZpl(label,printer);
    return sendNetwork(printer,Buffer.from(command,"utf8"));
  }
  if(!printer.system?.deviceName)throw new Error("Choose an installed Windows printer");
  const win=new BrowserWindow({show:false,webPreferences:{sandbox:true}});
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(await labelHtml(label))}`);
  try{return await new Promise<any>((resolve,reject)=>win.webContents.print({silent:false,deviceName:printer.system?.deviceName,printBackground:true,margins:{marginType:"none"},pageSize:{width:Math.round(label.widthMm*1000),height:Math.round(label.heightMm*1000)}},(ok,reason)=>ok?resolve({ok:true,message:"Label sent to Windows printer"}):reject(new Error(reason))));}
  finally{win.close()}
}
async function getLabelPrintSelection(labelId:string,printerId:string){
  const labels=await repo.load("labels") as any[],printers=await repo.load("printers") as any[];
  const savedLabel=labels.find(x=>x.id===labelId);if(!savedLabel)throw new Error("Label template not found");
  const savedPrinter=printers.find(x=>x.id===printerId);if(!savedPrinter)throw new Error("Label printer not found");
  const label=labelTemplateSchema.parse(savedLabel),printer=printerSchema.parse(savedPrinter);
  if(printer.printerType!=="label")throw new Error("Only label printers can print product labels");
  return{label,printer};
}
async function printSavedSale(saleId:string){
  const c=await getContext(saleId), printers=await repo.load("printers") as any[], printer=printers.find(p=>p.id===c.sale.printerId&&p.printerType==="receipt")||printers.find(p=>p.id===c.shop.defaultPrinterId&&p.printerType==="receipt");
  if(!printer)throw new Error("No receipt printer configured");
  try{const result=await printLines(printer,c.lines);c.sale.printStatus="succeeded";await repo.upsert("sales",c.sale);await log(`PRINT_OK printer=${printer.id} bytes=${result.bytes||0}`);return result;}
  catch(e:any){c.sale.printStatus="failed";await repo.upsert("sales",c.sale);await log(`PRINT_FAILED printer=${printer.id} error=${e.message}`);throw e;}
}
function registerIpc(){
  ipcMain.handle("data:load",(_,p)=>repo.load(collection.parse(p.collection)));
  ipcMain.handle("data:save",(_,p)=>repo.save(collection.parse(p.collection),p.data));
  ipcMain.handle("data:upsert",(_,p)=>repo.upsert(entityCollections.parse(p.collection),p.entity));
  ipcMain.handle("data:remove",(_,p)=>repo.remove(entityCollections.parse(p.collection),z.string().parse(p.id)));
  ipcMain.handle("sale:complete",async(_,p)=>{const sale=saleSchema.parse(p.sale);if(sale.printerId){const printers=await repo.load("printers") as any[],printer=printers.find(x=>x.id===sale.printerId);if(!printer||printer.printerType!=="receipt")throw new Error("POS sales can only use a receipt printer");}const number=await repo.reserveReceipt(sale.shopId);sale.receiptNumber=number;await repo.upsert("sales",sale);if(p.print){try{return{sale,print:await printSavedSale(sale.id)}}catch(e:any){return{sale,print:{ok:false,message:e.message}}}}return{sale};});
  ipcMain.handle("print:sale",(_,p)=>printSavedSale(z.string().parse(p.saleId)));
  ipcMain.handle("print:test",async(_,p)=>{const printers=await repo.load("printers") as any[], printer=printerSchema.parse(printers.find(x=>x.id===p.printerId));return printer.connectionType==="network"?testNetwork(printer):{ok:true,message:"System printer selected"};});
  ipcMain.handle("print:template-test",async(_,p)=>{
    const printerId=z.string().parse(p.printerId),templateId=z.string().parse(p.templateId);
    const printers=await repo.load("printers") as any[], savedPrinter=printers.find(x=>x.id===printerId);if(!savedPrinter)throw new Error("Receipt printer not found");
    const printer=printerSchema.parse(savedPrinter);if(printer.printerType!=="receipt")throw new Error("Receipt tests can only use a receipt printer");
    const templates=await repo.load("templates") as any[], template=templates.find(x=>x.id===templateId);if(!template)throw new Error("Receipt template not found");
    const shops=await repo.load("shops") as any[], shop=shops.find(x=>x.id===template.shopId);if(!shop)throw new Error("Template shop not found");
    const createdAt=new Date().toISOString(),sale={id:crypto.randomUUID(),shopId:shop.id,templateId:template.id,printerId:printer.id,receiptNumber:"TEST-RECEIPT",customerSnapshot:{name:"Sample Customer",phone:"01700-000000"},items:[{id:crypto.randomUUID(),name:"Sample Product",sku:"TEST-001",quantity:2,unitPrice:25000,discount:0,taxRate:0,lineSubtotal:50000,lineTax:0,lineTotal:50000}],subtotal:50000,discount:0,tax:0,total:50000,paymentMethod:"cash",amountPaid:50000,changeDue:0,note:"Printer test - no sale was recorded",status:"completed",printStatus:"not_printed",createdAt};
    const result=await printLines(printer,await renderWithAssets(template,sale,shop));await log(`TEST_PRINT_OK printer=${printer.id} template=${template.id}`);return result;
  });
  ipcMain.handle("print:list",async()=>{const win=BrowserWindow.getAllWindows()[0];return (await win.webContents.getPrintersAsync()).map(p=>({name:p.name,displayName:p.displayName}))});
  ipcMain.handle("print:product-label",async(_,p)=>{
    const productId=z.string().parse(p.productId),labelId=z.string().parse(p.labelId),printerId=z.string().parse(p.printerId);
    const {label,printer}=await getLabelPrintSelection(labelId,printerId),products=await repo.load("products") as any[];
    const savedProduct=products.find(x=>x.id===productId);if(!savedProduct)throw new Error("Product not found");
    const product=productSchema.parse(savedProduct),shops=await repo.load("shops") as any[],shop=shops.find(x=>x.id===label.shopId)||shops.find(x=>product.shopIds.includes(x.id))||shops[0];
    const result=await printLabelTemplate(bindProductLabel(label,product,shop),printer);await log(`PRODUCT_LABEL_PRINT_OK printer=${printer.id} label=${label.id} product=${product.id}`);return result;
  });
  ipcMain.handle("print:label-test",async(_,p)=>{
    const labelId=z.string().parse(p.labelId),printerId=z.string().parse(p.printerId),{label,printer}=await getLabelPrintSelection(labelId,printerId);
    const shops=await repo.load("shops") as any[],shop=shops.find(x=>x.id===label.shopId)||shops[0];
    const result=await printLabelTemplate(bindProductLabel(label,sampleLabelProduct,shop),printer);await log(`LABEL_TEST_OK printer=${printer.id} label=${label.id}`);return result;
  });
  ipcMain.handle("sale:pdf",async(_,p)=>{const c=await getContext(z.string().parse(p.saleId)), choice=await dialog.showSaveDialog({defaultPath:`receipt-${c.sale.receiptNumber}.pdf`,filters:[{name:"PDF",extensions:["pdf"]}]});if(choice.canceled||!choice.filePath)return{canceled:true};const win=new BrowserWindow({show:false,webPreferences:{sandbox:true}});await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`<style>@page{size:80mm auto;margin:3mm}body{font:12px monospace;width:72mm}</style>${linesToHtml(c.lines)}`)}`);await writeFile(choice.filePath,await win.webContents.printToPDF({pageSize:{width:80000,height:Math.max(120000,c.lines.length*7000)},printBackground:true}));win.close();return{path:choice.filePath};});
  ipcMain.handle("backup:export",()=>repo.exportBackup());ipcMain.handle("backup:import",()=>repo.importBackup());
  ipcMain.handle("asset:choose-shop-logo",()=>repo.chooseShopLogo());
  ipcMain.handle("asset:read-shop-logo",(_,p)=>repo.readShopLogo(z.string().parse(p.assetId)));
  ipcMain.handle("logs:open",async()=>{await mkdir(logs(),{recursive:true});await shell.openPath(logs())});
  ipcMain.handle("diagnostics:copy",async()=>{const printers=await repo.load("printers") as any[];clipboard.writeText(JSON.stringify({version:app.getVersion(),platform:process.platform,arch:process.arch,printers:printers.map(p=>({name:p.name,type:p.connectionType,paper:p.paperWidthMm}))},null,2))});
}
app.whenReady().then(async()=>{await repo.init();await repo.rotateBackup();registerIpc();await log(`APP_START version=${app.getVersion()}`);createWindow();app.on("activate",()=>{if(!BrowserWindow.getAllWindows().length)createWindow()})});
app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit()});
process.on("uncaughtException",e=>void log(`UNCAUGHT ${e.stack||e.message}`));process.on("unhandledRejection",e=>void log(`UNHANDLED ${String(e)}`));
