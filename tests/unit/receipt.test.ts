import { describe, expect, it } from "vitest";
import { renderReceipt, wrapText } from "../../src/main/receipt/render";
import { escPosBytes, sanitizeEscPosText } from "../../src/main/printing/escpos";
import { starterTemplate } from "../../shared/defaults";
import type { Sale, Shop } from "../../shared/schemas";
const shop:Shop={id:"shop",name:"Corner & Co",addressLines:["One Street"],currency:"USD",locale:"en-US",nextReceiptNumber:1,archived:false,createdAt:"x",updatedAt:"x"};
const sale:Sale={id:"sale",shopId:"shop",templateId:"t",receiptNumber:"R-1",items:[{id:"i",name:"Coffee",quantity:2,unitPrice:250,discount:0,taxRate:5,lineSubtotal:500,lineTax:25,lineTotal:525}],subtotal:500,discount:0,tax:25,total:525,paymentMethod:"cash",status:"completed",printStatus:"not_printed",createdAt:"2026-01-01T12:00:00Z"};
describe("canonical receipt pipeline",()=>{
 it("wraps words to the printer width",()=>expect(wrapText("alpha beta gamma",10)).toEqual(["alpha beta","gamma"]));
 it("hides conditional customer blocks",()=>expect(renderReceipt(starterTemplate(shop.id),{shop,sale}).some(x=>x.type==="text"&&x.text.startsWith("Customer"))).toBe(false));
 it("resolves receipt content and totals",()=>expect(JSON.stringify(renderReceipt(starterTemplate(shop.id),{shop,sale}))).toContain("$5.25"));
 it("creates functional QR payload content from the receipt",()=>{const qr=renderReceipt(starterTemplate(shop.id),{shop,sale}).find(x=>x.type==="qrcode");expect(qr).toMatchObject({type:"qrcode",value:expect.stringContaining("Corner & Co")});expect(qr).toMatchObject({value:expect.stringContaining("R-1")})});
 it("generates initialized ESC/POS bytes and cut command",()=>{const data=escPosBytes(renderReceipt(starterTemplate(shop.id),{shop,sale}));expect([...data.slice(0,2)]).toEqual([0x1b,0x40]);expect(data.includes(Buffer.from([0x1d,0x56]))).toBe(true)});
 it("lays columns within the profile width",()=>{const data=escPosBytes([{type:"columns",columns:[{text:"Total",width:30,align:"left"},{text:"$1.00",width:18,align:"right"}]}],48,false,0);expect(data.toString("ascii")).toContain("Total")});
 it("removes non-breaking and direction-control characters before printing",()=>{expect(sanitizeEscPosText("BDT\u00a0\u200e1,250.00")).toBe("BDT 1,250.00");expect(escPosBytes([{type:"text",text:"BDT\u00a01,250.00",align:"left"}],48,false,0).includes(0xa0)).toBe(false)});
});
