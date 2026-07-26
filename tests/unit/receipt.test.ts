import { describe, expect, it } from "vitest";
import { renderReceipt, wrapText } from "../../src/main/receipt/render";
import { escPosBytes, sanitizeEscPosText } from "../../src/main/printing/escpos";
import { starterTemplate } from "../../shared/defaults";
import type { Sale, Shop } from "../../shared/schemas";
const shop:Shop={id:"shop",name:"Corner & Co",addressLines:["One Street"],phone:"01234",email:"hello@example.com",currency:"USD",locale:"en-US",nextReceiptNumber:1,archived:false,loyalty:{enabled:false,spendAmount:50000,pointsAwarded:1,redemptionPoints:1,redemptionValue:100},createdAt:"x",updatedAt:"x"};
const sale:Sale={id:"sale",shopId:"shop",templateId:"t",receiptNumber:"R-1",items:[{id:"i",name:"Coffee",quantity:2,unitPrice:250,discount:0,taxRate:5,lineSubtotal:500,lineTax:25,lineTotal:525}],subtotal:500,discount:0,tax:25,total:525,paymentMethod:"cash",amountPaid:600,changeDue:75,status:"completed",transactionType:"sale",returnedItems:[],pointsEarned:0,pointsRedeemed:0,pointsReversed:0,pointDiscount:0,printStatus:"not_printed",createdAt:"2026-01-01T12:00:00Z"};
describe("canonical receipt pipeline",()=>{
 it("wraps words to the printer width",()=>expect(wrapText("alpha beta gamma",10)).toEqual(["alpha beta","gamma"]));
 it("hides conditional customer blocks",()=>expect(renderReceipt(starterTemplate(shop.id),{shop,sale}).some(x=>x.type==="text"&&x.text.startsWith("Customer"))).toBe(false));
 it("resolves matching contact, payment, and total content",()=>{const value=JSON.stringify(renderReceipt(starterTemplate(shop.id),{shop,sale}));expect(value).toContain("hello@example.com");expect(value).toContain("Amount paid: $6.00");expect(value).toContain("Change: $0.75");expect(value).toContain("$5.25")});
 it("marks the final total as bold",()=>{const total=renderReceipt(starterTemplate(shop.id),{shop,sale}).find(line=>line.type==="columns"&&line.columns[0]?.text==="TOTAL");expect(total).toMatchObject({type:"columns",bold:true})});
 it("renders an optional loyalty block",()=>{
  const template=starterTemplate(shop.id);
  template.blocks.push({id:"points",type:"loyalty",align:"left",bold:false,underline:false,size:"normal",spacingTop:0,spacingBottom:0,visibleWhen:"always",settings:{}});
  const value=JSON.stringify(renderReceipt(template,{shop,sale:{...sale,pointsEarned:4,pointsRedeemed:2,pointsBalanceAfter:12}}));
  expect(value).toContain("Points earned: 4");
  expect(value).toContain("Points redeemed: 2");
  expect(value).toContain("Points balance: 12");
 });
 it("creates a centered, sized functional QR payload",()=>{const qr=renderReceipt(starterTemplate(shop.id),{shop,sale}).find(x=>x.type==="qrcode");expect(qr).toMatchObject({type:"qrcode",align:"center",moduleSize:5,value:expect.stringContaining("Corner & Co")});expect(qr).toMatchObject({value:expect.stringContaining("R-1")})});
 it("generates initialized ESC/POS bytes and cut command",()=>{const data=escPosBytes(renderReceipt(starterTemplate(shop.id),{shop,sale}));expect([...data.slice(0,2)]).toEqual([0x1b,0x40]);expect(data.includes(Buffer.from([0x1d,0x56]))).toBe(true)});
 it("lays columns within the profile width",()=>{const data=escPosBytes([{type:"columns",columns:[{text:"Total",width:30,align:"left"},{text:"$1.00",width:18,align:"right"}]}],48,false,0);expect(data.toString("ascii")).toContain("Total")});
 it("emits bold mode for bold column rows",()=>{const data=escPosBytes([{type:"columns",bold:true,columns:[{text:"TOTAL",width:30,align:"left"},{text:"$1.00",width:18,align:"right"}]}],48,false,0);expect(data.includes(Buffer.from([0x1b,0x45,1]))).toBe(true)});
 it("centers QR output and sets its module size",()=>{const data=escPosBytes([{type:"qrcode",value:"R-1",align:"center",moduleSize:5}],48,false,0);expect(data.includes(Buffer.from([0x1b,0x61,1]))).toBe(true);expect(data.includes(Buffer.from([0x1d,0x28,0x6b,3,0,0x31,0x43,5]))).toBe(true)});
 it("removes non-breaking and direction-control characters before printing",()=>{expect(sanitizeEscPosText("BDT\u00a0\u200e1,250.00")).toBe("BDT 1,250.00");expect(escPosBytes([{type:"text",text:"BDT\u00a01,250.00",align:"left"}],48,false,0).includes(0xa0)).toBe(false)});
});
