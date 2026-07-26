import { describe, expect, it } from "vitest";
import { labelTemplateSchema, printerSchema, productSchema, saleSchema } from "../../shared/schemas";
describe("persisted schemas",()=>{
 it("rejects fractional minor-unit prices",()=>expect(productSchema.safeParse({id:"p",shopIds:[],name:"X",price:1.5,isActive:true,createdAt:"x",updatedAt:"x"}).success).toBe(false));
 it("rejects invalid printer ports",()=>expect(printerSchema.safeParse({id:"p",name:"x",connectionType:"network",network:{host:"x",port:70000,timeoutMs:5000},paperWidthMm:80,printableWidthMm:72,characterWidth:48,encoding:"CP437",cutAfterPrint:true,openDrawerAfterPrint:false,feedLinesAfterPrint:4,createdAt:"x",updatedAt:"x"}).success).toBe(false));
 it("requires sale snapshots to remain complete",()=>expect(saleSchema.safeParse({id:"s",shopId:"x",templateId:"t",receiptNumber:"R1",items:[],subtotal:0,discount:0,tax:0,total:0,paymentMethod:"cash",status:"completed",createdAt:"x"}).success).toBe(false));
 it("accepts a fully custom label sheet size",()=>expect(labelTemplateSchema.safeParse({id:"l",name:"Custom",widthMm:63.5,heightMm:38.1,dpi:203,orientation:"portrait",elements:[],createdAt:"x",updatedAt:"x"}).success).toBe(true));
});
