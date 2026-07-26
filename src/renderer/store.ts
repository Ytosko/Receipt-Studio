import { create } from "zustand";
import type { Customer, LabelTemplate, PrinterProfile, Product, ReceiptTemplate, Sale, Settings, Shop } from "../../shared/schemas";
type Data={shops:Shop[];products:Product[];customers:Customer[];sales:Sale[];templates:ReceiptTemplate[];labels:LabelTemplate[];printers:PrinterProfile[];settings:Settings;loaded:boolean};
type Store=Data&{load:()=>Promise<void>;setSettings:(s:Settings)=>Promise<void>;upsert:<K extends "shops"|"products"|"customers"|"templates"|"labels"|"printers">(k:K,v:Data[K][number])=>Promise<void>;remove:(k:"shops"|"products"|"customers"|"templates"|"labels"|"printers",id:string)=>Promise<void>};
export const useStore=create<Store>((set,get)=>({
  shops:[],products:[],customers:[],sales:[],templates:[],labels:[],printers:[],settings:{theme:"light",setupComplete:false,paymentMethods:["Cash","Card","Mobile","Other"]},loaded:false,
  load:async()=>{const [shops,products,customers,sales,templates,labels,printers,settings]=await Promise.all([
    window.receiptStudio.load<Shop[]>("shops"),window.receiptStudio.load<Product[]>("products"),window.receiptStudio.load<Customer[]>("customers"),
    window.receiptStudio.load<Sale[]>("sales"),window.receiptStudio.load<ReceiptTemplate[]>("templates"),window.receiptStudio.load<LabelTemplate[]>("labels"),window.receiptStudio.load<PrinterProfile[]>("printers"),window.receiptStudio.load<Settings>("settings")
  ]);set({shops,products,customers,sales,templates,labels,printers,settings,loaded:true});},
  setSettings:async settings=>{await window.receiptStudio.save("settings",settings);set({settings})},
  upsert:async(k,v)=>{await window.receiptStudio.upsert(k,v);const list=get()[k] as any[];set({[k]:[...list.filter(x=>x.id!==v.id),v]} as any)},
  remove:async(k,id)=>{await window.receiptStudio.remove(k,id);set({[k]:(get()[k] as any[]).filter(x=>x.id!==id)} as any)}
}));
