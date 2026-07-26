import { describe,expect,it } from "vitest";
import { labelToTspl,labelToZpl } from "../../src/main/printing/label";
import type { LabelTemplate,PrinterProfile } from "../../shared/schemas";
const label:LabelTemplate={id:"l",name:"4x6",widthMm:101.6,heightMm:152.4,dpi:203,orientation:"portrait",createdAt:"x",updatedAt:"x",elements:[
 {id:"t",type:"text",x:5,y:5,width:80,height:10,text:"Shipping Label",fontSize:16,bold:true,rotation:0,barcodeFormat:"code128"},
 {id:"b",type:"barcode",x:5,y:20,width:80,height:25,text:"ABC123",fontSize:12,bold:false,rotation:0,barcodeFormat:"code128"},
 {id:"q",type:"qrcode",x:5,y:50,width:30,height:30,text:"ORDER-123",fontSize:12,bold:false,rotation:0,barcodeFormat:"code128"}
]};
const printer:PrinterProfile={id:"p",name:"Label",printerType:"label",connectionType:"network",network:{host:"127.0.0.1",port:9100,timeoutMs:500},paperWidthMm:101.6,paperHeightMm:152.4,printableWidthMm:101.6,characterWidth:48,encoding:"CP437",cutAfterPrint:false,openDrawerAfterPrint:false,feedLinesAfterPrint:0,dpi:203,orientation:"portrait",commandLanguage:"zpl",labelGapMm:3,printSpeed:4,darkness:8,createdAt:"x",updatedAt:"x"};
describe("label printer languages",()=>{
 it("generates sized ZPL with barcode and QR commands",()=>{const value=labelToZpl(label,printer);expect(value).toContain("^PW812");expect(value).toContain("^BCN");expect(value).toContain("^BQN");expect(value).toContain("^XZ")});
 it("generates TSPL with custom metric size",()=>{const value=labelToTspl(label,{...printer,commandLanguage:"tspl"});expect(value).toContain("SIZE 101.6 mm,152.4 mm");expect(value).toContain("BARCODE");expect(value).toContain("QRCODE");expect(value).toContain("PRINT 1,1")});
});
