import { lazy, Suspense, useEffect, useState } from "react";
import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { ChevronRight, FileText, Gauge, Package, Plus, Printer, ReceiptText, Settings as SettingsIcon, ShoppingCart, Store, Tags, Users } from "lucide-react";
import { useStore } from "./store";
import { Dashboard, EntityPage, SettingsPage } from "./pages";
import { SalePage, SalesPage } from "./sale";
import { TemplatePage } from "./template";
import { ShopForm } from "./forms";
import { starterTemplate } from "../../shared/defaults";
const LabelsPage=lazy(()=>import("./labels").then(module=>({default:module.LabelsPage})));
const nav=[["/","Dashboard",Gauge],["/sale","New Sale",ShoppingCart],["/sales","Sales",ReceiptText],["/products","Products",Package],["/customers","Customers",Users],["/shops","Shops",Store],["/templates","Receipt Templates",FileText],["/labels","Label Templates",Tags],["/printers","Printers",Printer],["/settings","Settings",SettingsIcon]] as const;
function Setup(){
 const {shops,settings,setSettings,upsert}=useStore();const [step,setStep]=useState(0);
 if(settings.setupComplete)return null;
 const finish=async()=>setSettings({...settings,setupComplete:true,activeShopId:shops[0]?.id});
 return <div className="fixed inset-0 z-[60] bg-[#160c2f] text-[#f5efff] flex">
  <div className="w-[42%] p-16 flex flex-col justify-between bg-[#29105f]"><div><img src="./logo.png" alt="Receipt Studio" className="w-32 h-32 object-contain drop-shadow-2xl"/><h1 className="text-5xl font-black tracking-tight mt-8 leading-[1.05]">Receipts that feel<br/>like your shop.</h1><p className="text-[#d8c9ff] mt-5 max-w-md text-lg">Design, sell, and print locally. Your data never needs to leave this computer.</p></div><p className="text-sm text-[#bca9ec]">Receipt Studio · Local-first by design</p></div>
  <div className="flex-1 flex items-center justify-center p-14"><div className="w-full max-w-xl">{step===0?<><p className="text-[#ff6676] font-bold uppercase tracking-widest text-sm">Welcome</p><h2 className="text-4xl font-bold mt-3">Let’s set up your counter.</h2><p className="text-[#c9bbdf] mt-4 mb-8">Start with your shop, then connect whichever receipt or label printer you actually use.</p><button className="btn btn-primary !bg-[#ff6676] !text-white !border-0 px-6" onClick={()=>setStep(1)}>Create my shop <ChevronRight size={18}/></button></>:<><p className="text-[#ff6676] font-bold uppercase tracking-widest text-sm">Your shop</p><h2 className="text-3xl font-bold mt-2 mb-6">Tell us what goes on the receipt.</h2><ShopForm dark onSave={async shop=>{const template=starterTemplate(shop.id),configured={...shop,defaultTemplateId:template.id};await upsert("shops",configured);await upsert("templates",template);await setSettings({...settings,setupComplete:true,activeShopId:shop.id})}}/></>}</div></div>
  <button onClick={finish} className="absolute right-8 top-8 text-sm text-[#9ab0aa] hover:text-white">Skip setup</button>
 </div>
}
export default function App(){
 const store=useStore();const navigate=useNavigate();const load=store.load;useEffect(()=>{void load()},[load]);useEffect(()=>{document.documentElement.classList.remove("dark")},[]);
 useEffect(()=>{const fn=(e:KeyboardEvent)=>{if(e.ctrlKey&&e.key.toLowerCase()==="n"){e.preventDefault();navigate("/sale")}if(e.key==="/"&&!["INPUT","TEXTAREA"].includes((e.target as HTMLElement).tagName)){e.preventDefault();(document.querySelector("[data-product-search]") as HTMLInputElement)?.focus()}};window.addEventListener("keydown",fn);return()=>window.removeEventListener("keydown",fn)},[navigate]);
 if(!store.loaded)return <div className="h-screen flex items-center justify-center bg-[#29105f] text-white"><img src="./logo.png" alt="Receipt Studio" className="w-24 h-24 object-contain animate-pulse"/></div>;
 const active=store.shops.find(s=>s.id===store.settings.activeShopId)||store.shops[0];
 return <div className="h-screen flex overflow-hidden">
  <aside className="w-[238px] bg-[#25104f] text-[#f0eaff] p-4 flex flex-col no-print">
   <div className="flex items-center gap-3 px-2 py-3 mb-4"><img src="./logo.png" alt="" className="w-12 h-12 object-contain"/><div><div className="font-bold">Receipt Studio</div><div className="text-[10px] text-[#beaaf0] uppercase tracking-widest">Local POS</div></div></div>
   <nav className="space-y-1">{nav.map(([to,label,Icon])=><NavLink key={to} to={to} end={to==="/"} className={({isActive})=>`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${isActive?"bg-white text-[#5020c6] shadow-sm":"hover:bg-[#3b1b76]"}`}><Icon size={18}/>{label}</NavLink>)}</nav>
   <div className="mt-auto border-t border-[#4d3282] pt-4 px-2"><p className="text-[10px] uppercase tracking-wider text-[#baa7e7] mb-2">Active shop</p><select className="w-full bg-[#3b1b76] rounded-lg p-2 text-sm" value={active?.id||""} onChange={e=>void store.setSettings({...store.settings,activeShopId:e.target.value})}>{store.shops.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
  </aside>
  <main className="flex-1 min-w-0 flex flex-col"><header className="h-[68px] bg-[#faf9f5] border-b border-[#deded6] flex items-center justify-between px-7 no-print"><div><p className="text-xs text-[#7c8581]">WORKSPACE</p><p className="font-bold">{active?.name||"No shop configured"}</p></div><button className="btn btn-primary" onClick={()=>navigate("/sale")}><Plus size={17}/>New sale</button></header>
   <div className="flex-1 overflow-auto p-7 scrollbar"><Routes><Route path="/" element={<Dashboard/>}/><Route path="/sale" element={<SalePage/>}/><Route path="/sales" element={<SalesPage/>}/><Route path="/products" element={<EntityPage kind="products"/>}/><Route path="/customers" element={<EntityPage kind="customers"/>}/><Route path="/shops" element={<EntityPage kind="shops"/>}/><Route path="/templates" element={<TemplatePage/>}/><Route path="/labels" element={<Suspense fallback={<div className="p-10 text-center">Loading label designer…</div>}><LabelsPage/></Suspense>}/><Route path="/printers" element={<EntityPage kind="printers"/>}/><Route path="/settings" element={<SettingsPage/>}/></Routes></div>
  </main><Setup/>
 </div>
}
