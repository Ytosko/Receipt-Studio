import type { ReceiptBlock, ReceiptTemplate, Sale, Shop } from "../../../shared/schemas.js";
import { formatMoney } from "../../../shared/money.js";
import { receiptLoyaltyText, receiptMetadata, receiptPaymentText, receiptQrValue, shopContactLines } from "../../../shared/receiptContent.js";
export type RenderLine =
  | { type:"text"; text:string; align:"left"|"center"|"right"; bold?:boolean; underline?:boolean; size?:ReceiptBlock["size"] }
  | { type:"columns"; columns:Array<{text:string;width:number;align:"left"|"right"}>; bold?:boolean }
  | { type:"divider"; character:string } | { type:"feed"; lines:number }
  | { type:"qrcode"; value:string; align:"left"|"center"|"right"; moduleSize:number; dataUrl?:string }
  | { type:"logo"; align:"left"|"center"|"right"; widthMm:number }
  | { type:"image"; data:Uint8Array; widthBytes:number; height:number; align:"left"|"center"|"right"; widthMm:number; dataUrl?:string };
type Context = { shop: Shop; sale: Sale };
const visible = (b: ReceiptBlock, c: Context) => b.visibleWhen === "always" ||
  (b.visibleWhen === "customer" && !!c.sale.customerSnapshot) || (b.visibleWhen === "tax" && c.sale.tax !== 0) ||
  (b.visibleWhen === "discount" && c.sale.discount !== 0) || (b.visibleWhen === "note" && !!c.sale.note) ||
  (b.visibleWhen === "payment" && c.sale.amountPaid !== undefined);
const vars = (text: string, c: Context) => {
  const money = (n?:number) => formatMoney(n ?? 0, c.shop.currency, c.shop.locale);
  const d = new Date(c.sale.createdAt);
  const map:Record<string,string> = {
    "shop.name":c.shop.name, "shop.address":c.shop.addressLines.join(", "), "shop.phone":c.shop.phone||"",
    "shop.email":c.shop.email||"", "shop.website":c.shop.website||"", "shop.taxId":c.shop.taxId||"",
    "receipt.number":c.sale.receiptNumber, "sale.date":d.toLocaleDateString(c.shop.locale), "sale.time":d.toLocaleTimeString(c.shop.locale),
    "customer.name":c.sale.customerSnapshot?.name||"", "customer.phone":c.sale.customerSnapshot?.phone||"",
    "customer.email":c.sale.customerSnapshot?.email||"", "sale.subtotal":money(c.sale.subtotal), "sale.discount":money(c.sale.discount),
    "sale.tax":money(c.sale.tax), "sale.total":money(c.sale.total), "sale.paymentMethod":c.sale.paymentMethod,
    "sale.amountPaid":money(c.sale.amountPaid), "sale.changeDue":money(c.sale.changeDue), "sale.note":c.sale.note||""
  };
  return text.replace(/\{\{([^}]+)\}\}/g, (_, key) => map[key.trim()] ?? "");
};
const text = (value:string,b:ReceiptBlock):RenderLine => ({type:"text",text:value,align:b.align,bold:b.bold,underline:b.underline,size:b.size});
export function renderReceipt(template: ReceiptTemplate, context: Context): RenderLine[] {
  const out:RenderLine[] = [], m=(n:number)=>formatMoney(n,context.shop.currency,context.shop.locale);
  for (const b of template.blocks.filter(x=>visible(x,context))) {
    if (b.spacingTop) out.push({type:"feed",lines:b.spacingTop});
    switch(b.type) {
      case "logo": out.push({type:"logo",align:b.align,widthMm:Math.max(8,Math.min(template.printableWidthMm,Number(b.settings.widthMm||40)))}); break;
      case "shopName": out.push(text(context.shop.name,b)); break;
      case "shopContact": out.push(text(shopContactLines(context.shop).join("\n"),b)); break;
      case "customText": case "footer": case "terms": out.push(text(vars(b.text||"",context),b)); break;
      case "divider": out.push({type:"divider",character:String(b.settings.character||"-").slice(0,1)}); break;
      case "metadata": {const metadata=receiptMetadata(context.sale,context.shop);out.push({type:"columns",columns:[{text:metadata.receipt,width:24,align:"left"},{text:metadata.dateTime,width:24,align:"right"}]});break;}
      case "datetime": out.push(text(new Date(context.sale.createdAt).toLocaleString(context.shop.locale),b)); break;
      case "receiptNumber": out.push(text(context.sale.receiptNumber,b)); break;
      case "customer": out.push(text([context.sale.customerSnapshot?.name?`Customer: ${context.sale.customerSnapshot.name}`:"",context.sale.customerSnapshot?.phone?`Phone: ${context.sale.customerSnapshot.phone}`:""].filter(Boolean).join("\n"),b)); break;
      case "items":
        out.push({type:"columns",bold:true,columns:[{text:"ITEM",width:30,align:"left"},{text:"TOTAL",width:18,align:"right"}]});
        for(const i of context.sale.items) out.push({type:"columns",columns:[{text:`${i.name} × ${i.quantity}`,width:30,align:"left"},{text:m(i.lineTotal),width:18,align:"right"}]});
        break;
      case "totals":
        out.push({type:"columns",columns:[{text:"Subtotal",width:30,align:"left"},{text:m(context.sale.subtotal),width:18,align:"right"}]});
        if(context.sale.discount) out.push({type:"columns",columns:[{text:"Discount",width:30,align:"left"},{text:`-${m(context.sale.discount)}`,width:18,align:"right"}]});
        if(context.sale.tax) out.push({type:"columns",columns:[{text:"Tax",width:30,align:"left"},{text:m(context.sale.tax),width:18,align:"right"}]});
        if(context.sale.pointDiscount) out.push({type:"columns",columns:[{text:"Points discount",width:30,align:"left"},{text:`-${m(context.sale.pointDiscount)}`,width:18,align:"right"}]});
        out.push({type:"columns",bold:true,columns:[{text:"TOTAL",width:30,align:"left"},{text:m(context.sale.total),width:18,align:"right"}]}); break;
      case "payment": out.push(text(receiptPaymentText(context.sale,context.shop),b)); break;
      case "loyalty": out.push(text(receiptLoyaltyText(context.sale),b)); break;
      case "qrcode": {
        out.push({type:"qrcode",value:receiptQrValue(b,context.sale,context.shop),align:b.align,moduleSize:Math.max(1,Math.min(16,Number(b.settings.moduleSize||5)))});break;
      }
      case "barcode": out.push(text(String(b.settings.value||context.sale.receiptNumber),b)); break;
      case "spacer": out.push({type:"feed",lines:Number(b.settings.lines||1)}); break;
      case "labelValue": out.push({type:"columns",columns:[{text:b.label||"Label",width:24,align:"left"},{text:vars(b.text||"",context),width:24,align:"right"}]}); break;
    }
    if (b.spacingBottom) out.push({type:"feed",lines:b.spacingBottom});
  }
  return out;
}
export const wrapText = (input:string,width:number) => input.split("\n").flatMap(paragraph => {
  const words=paragraph.split(/\s+/), lines:string[]=[]; let line="";
  for(const word of words){ if(!line) line=word; else if(`${line} ${word}`.length<=width) line+=` ${word}`; else {lines.push(line);line=word;} }
  if(line) lines.push(line); return lines;
});
export function linesToHtml(lines:RenderLine[], width=48) {
  const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
  return lines.map(l=>{
    if(l.type==="feed") return `<div style="height:${l.lines*12}px"></div>`;
    if(l.type==="divider") return `<div>${esc(l.character.repeat(width))}</div>`;
    if(l.type==="columns") return `<div style="display:flex;justify-content:space-between;font-weight:${l.bold?700:400}">${l.columns.map(c=>`<span>${esc(c.text)}</span>`).join("")}</div>`;
    if(l.type==="qrcode") return l.dataUrl?`<div style="text-align:${l.align}"><img alt="QR code" src="${l.dataUrl}" style="width:${l.moduleSize*5}mm;height:${l.moduleSize*5}mm;image-rendering:pixelated"></div>`:`<div style="text-align:${l.align}">${esc(l.value)}</div>`;
    if(l.type==="image") return l.dataUrl?`<div style="text-align:${l.align}"><img alt="" src="${l.dataUrl}" style="width:${l.widthMm}mm;max-height:25mm;object-fit:contain"></div>`:"";
    if(l.type==="logo") return "";
    return wrapText(l.text,width).map(t=>`<div style="text-align:${l.align};font-weight:${l.bold?700:400};text-decoration:${l.underline?"underline":"none"};font-size:${l.size==="xlarge"?20:l.size==="large"?16:l.size==="small"?10:12}px">${esc(t)||"&nbsp;"}</div>`).join("");
  }).join("");
}
