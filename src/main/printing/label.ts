import type { LabelTemplate, PrinterProfile } from "../../../shared/schemas.js";

const dots=(mm:number,dpi:number)=>Math.round(mm*dpi/25.4);
const safe=(value:string)=>value.replace(/[\^~]/g," ").replace(/"/g,"'");
export function labelToZpl(label:LabelTemplate,profile:PrinterProfile){
  const dpi=profile.dpi||label.dpi,w=dots(label.widthMm,dpi),h=dots(label.heightMm,dpi),out=[`^XA`,`^PW${w}`,`^LL${h}`,profile.orientation==="landscape"?"^POI":"^PON"];
  for(const e of label.elements){const x=dots(e.x,dpi),y=dots(e.y,dpi),ew=dots(e.width,dpi),eh=dots(e.height,dpi),value=safe(e.text);
    if(e.type==="text")out.push(`^FO${x},${y}^A0N,${Math.max(12,dots(e.fontSize*.3528,dpi))},${Math.max(10,dots(e.fontSize*.25,dpi))}^FD${value}^FS`);
    if(e.type==="barcode"){const command=e.barcodeFormat==="code39"?`^B3N,N,${eh},Y,N`:e.barcodeFormat==="ean13"?`^BEN,${eh},Y,N`:e.barcodeFormat==="upca"?`^BUN,${eh},Y,N`:`^BCN,${eh},Y,N,N`;out.push(`^FO${x},${y}${command}^FD${value}^FS`)}
    if(e.type==="qrcode")out.push(`^FO${x},${y}^BQN,2,${Math.max(2,Math.min(10,Math.round(ew/80)))}^FDLA,${value}^FS`);
    if(e.type==="box")out.push(`^FO${x},${y}^GB${ew},${eh},2^FS`);
    if(e.type==="line")out.push(`^FO${x},${y}^GB${ew},${Math.max(2,eh)},${Math.max(2,eh)}^FS`);
  }return `${out.join("\n")}\n^XZ\n`;
}
export function labelToTspl(label:LabelTemplate,profile:PrinterProfile){
  const dpi=profile.dpi||label.dpi,d=(mm:number)=>dots(mm,dpi),out=[`SIZE ${label.widthMm} mm,${label.heightMm} mm`,`GAP ${profile.labelGapMm||0} mm,0 mm`,`DENSITY ${profile.darkness||8}`,"CLS"];
  for(const e of label.elements){const x=d(e.x),y=d(e.y),w=d(e.width),h=d(e.height),value=safe(e.text);
    if(e.type==="text")out.push(`TEXT ${x},${y},"0",${e.rotation},1,1,"${value}"`);
    if(e.type==="barcode"){const format=e.barcodeFormat==="code39"?"39":e.barcodeFormat==="ean13"?"EAN13":e.barcodeFormat==="upca"?"UPCA":"128";out.push(`BARCODE ${x},${y},"${format}",${h},1,${e.rotation},2,2,"${value}"`)}
    if(e.type==="qrcode")out.push(`QRCODE ${x},${y},L,${Math.max(2,Math.min(10,Math.round(w/50)))},A,${e.rotation},"${value}"`);
    if(e.type==="box")out.push(`BOX ${x},${y},${x+w},${y+h},2`);
    if(e.type==="line")out.push(`BAR ${x},${y},${w},${Math.max(1,h)}`);
  }return `${out.join("\r\n")}\r\nPRINT 1,1\r\n`;
}
