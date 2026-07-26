import { useEffect, useState, type ReactNode } from "react";
import type { ReceiptTemplate, Sale, Shop } from "../../shared/schemas";
import { formatMoney } from "../../shared/money";
import QRCode from "qrcode";
function RealQr({value}:{value:string}){const [src,setSrc]=useState("");useEffect(()=>{void QRCode.toDataURL(value,{errorCorrectionLevel:"M",margin:1,width:220}).then(setSrc)},[value]);return src?<img src={src} alt="Scannable receipt QR code" className="w-28 h-28 mx-auto [image-rendering:pixelated]"/>:<div className="w-28 h-28 mx-auto bg-gray-100 animate-pulse"/>}
export function ReceiptPreview({template,sale,shop,selectedBlockId,onSelectBlock}:{template?:ReceiptTemplate;sale:Partial<Sale>;shop?:Shop;selectedBlockId?:string;onSelectBlock?:(id:string)=>void}){
  const [logo,setLogo]=useState("");
  useEffect(()=>{if(shop?.logoAssetId)void window.receiptStudio.readShopLogo(shop.logoAssetId).then(setLogo).catch(()=>setLogo(""));else setLogo("")},[shop?.logoAssetId]);
  if(!shop)return <div className="receipt flex items-center justify-center text-center text-sm">Create a shop to preview receipts.</div>;
  const blocks=template?.blocks||[];const money=(v=0)=>formatMoney(v,shop.currency,shop.locale);
  const selectable=(id:string,node:ReactNode)=><div key={id} onClick={e=>{if(onSelectBlock){e.stopPropagation();onSelectBlock(id)}}} className={`${onSelectBlock?"cursor-pointer rounded-sm transition":""} ${selectedBlockId===id?"outline outline-2 outline-[#6b25e9] outline-offset-2 bg-[#eee6ff66]":onSelectBlock?"hover:outline hover:outline-1 hover:outline-[#a98ae8]":""}`}>{node}</div>;
  return <div className="receipt text-[12px] leading-[1.45]">
    {blocks.map(b=>{
      if(b.visibleWhen==="customer"&&!sale.customerSnapshot)return null;if(b.visibleWhen==="tax"&&!sale.tax)return null;if(b.visibleWhen==="discount"&&!sale.discount)return null;
      const style={textAlign:b.align,fontWeight:b.bold?700:400,textDecoration:b.underline?"underline":"none",fontSize:b.size==="xlarge"?20:b.size==="large"?16:b.size==="small"?10:12,marginTop:b.spacingTop*4,marginBottom:b.spacingBottom*4} as const;
      let content:ReactNode=null;
      switch(b.type){
        case"logo":content=logo?<div style={style}><img src={logo} alt="" className="max-w-[140px] max-h-[80px] object-contain inline-block"/></div>:<div style={style} className="text-[10px] text-gray-400">Logo (not configured)</div>;break;
        case"shopName":content=<div style={style}>{shop.name}</div>;break;
        case"shopContact":content=<div style={style}>{shop.addressLines.map((x,i)=><div key={i}>{x}</div>)}<div>{shop.phone}</div></div>;break;
        case"divider":content=<div className="overflow-hidden whitespace-nowrap">------------------------------------------------</div>;break;
        case"metadata":content=<div className="flex justify-between"><span>#{sale.receiptNumber||"DRAFT"}</span><span>{new Date().toLocaleDateString()}</span></div>;break;
        case"customer":content=<div><div>Customer: {sale.customerSnapshot?.name}</div>{sale.customerSnapshot?.phone&&<div>Phone: {sale.customerSnapshot.phone}</div>}</div>;break;
        case"items":content=<div className="my-2"><div className="flex font-bold justify-between"><span>ITEM</span><span>TOTAL</span></div>{sale.items?.map(i=><div className="flex justify-between" key={i.id}><span className="max-w-[190px]">{i.name} × {i.quantity}</span><span>{money(i.lineTotal)}</span></div>)}</div>;break;
        case"totals":content=<div className="my-2">{[["Subtotal",sale.subtotal],...(sale.discount?[["Discount",-sale.discount]]:[]),...(sale.tax?[["Tax",sale.tax]]:[])].map(([l,v])=><div className="flex justify-between" key={String(l)}><span>{l}</span><span>{money(Number(v))}</span></div>)}<div className="flex justify-between text-base font-bold mt-1"><span>TOTAL</span><span>{money(sale.total)}</span></div></div>;break;
        case"payment":content=<div style={style}>Paid by {sale.paymentMethod||"cash"}</div>;break;
        case"qrcode":{const mode=String(b.settings.content||"shopReceiptTotal"),receipt=sale.receiptNumber||"DRAFT",value=mode==="receipt"?receipt:mode==="receiptTotal"?`Receipt: ${receipt}\nTotal: ${money(sale.total)}`:mode==="custom"?(b.text||"{{receipt.number}}").replace(/\{\{receipt\.number\}\}/g,receipt).replace(/\{\{sale\.total\}\}/g,money(sale.total)).replace(/\{\{shop\.name\}\}/g,shop.name):`Shop: ${shop.name}\nReceipt: ${receipt}\nTotal: ${money(sale.total)}`;content=<div className="text-center my-2"><RealQr value={value}/></div>;break;}
        case"spacer":content=<div style={{height:Number(b.settings.lines||1)*10}}/>;break;
        case"footer":case"customText":case"terms":content=<div style={style}>{b.text}</div>;break;
        default:content=<div className="text-[10px] text-gray-400">{b.type}</div>;
      }
      return selectable(b.id,content);
    })}
  </div>
}
