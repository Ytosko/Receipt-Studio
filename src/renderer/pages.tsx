import { useEffect, useRef, useState } from "react";
import { Barcode, Download, Edit3, Plus, Printer, Search, Tags, Trash2, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatMoney } from "../../shared/money";
import type { Shop } from "../../shared/schemas";
import { DraftNumberInput, Empty, Modal, Stat } from "./components";
import { CustomerForm, PrinterForm, ProductForm, ShopForm } from "./forms";
import { useStore } from "./store";

export function Dashboard() {
  const store = useStore();
  const navigate = useNavigate();
  const shop = store.shops.find(value => value.id === store.settings.activeShopId) || store.shops[0];
  const receiptPrinter = store.printers.find(value => value.printerType === "receipt");
  const today = new Date().toDateString();
  const sales = store.sales.filter(value =>
    new Date(value.createdAt).toDateString() === today
    && value.status === "completed"
    && (!shop || value.shopId === shop.id)
  );
  const total = sales.reduce((sum, value) => sum + value.total, 0);

  return <div className="max-w-[1280px] mx-auto">
    <div className="flex justify-between items-end mb-7">
      <div>
        <p className="text-sm font-bold text-[#ff5f73] uppercase tracking-widest">Overview</p>
        <h1 className="text-3xl font-black mt-1">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}.</h1>
        <p className="text-[#737d79] mt-1">Here's what's happening at {shop?.name || "your shop"}.</p>
      </div>
      <button className="btn btn-primary" onClick={() => navigate("/sale")}><Plus size={17} />Start a sale</button>
    </div>
    {(!shop || !store.templates.length) && <div className="surface p-4 mb-5 border-[#e2be72] bg-[#fff8e8] text-sm">
      <b>Setup needed.</b> {!shop ? "Create your first shop." : "Add a receipt template before completing a sale."}
    </div>}
    <div className="grid grid-cols-4 gap-4">
      <Stat label="Today's sales" value={String(sales.length)} />
      <Stat label="Today's revenue" value={shop ? formatMoney(total, shop.currency, shop.locale) : "$0.00"} accent />
      <Stat label="Products" value={String(store.products.filter(value => value.isActive).length)} />
      <Stat label="Receipt printer" value={receiptPrinter?.name || "Not set"} />
    </div>
    <div className="grid grid-cols-[1.5fr_1fr] gap-5 mt-5">
      <div className="surface p-5">
        <div className="flex justify-between mb-4">
          <h2 className="font-bold">Recent sales</h2>
          <button className="text-sm font-bold text-[#1e7165]" onClick={() => navigate("/sales")}>View all</button>
        </div>
        {store.sales.length
          ? <div className="divide-y">{[...store.sales].reverse().slice(0, 6).map(value => <div key={value.id} className="py-3 flex justify-between">
            <div><p className="font-semibold">{value.receiptNumber}</p><p className="text-xs text-[#78827f]">{new Date(value.createdAt).toLocaleString()}</p></div>
            <p className="font-bold">{shop ? formatMoney(value.total, shop.currency, shop.locale) : value.total}</p>
          </div>)}</div>
          : <p className="text-sm text-[#78827f] py-8 text-center">Your completed sales will appear here.</p>}
      </div>
      <div className="surface p-5">
        <h2 className="font-bold mb-4">Quick actions</h2>
        <div className="space-y-2">
          <button className="btn w-full justify-start" onClick={() => navigate("/sale")}><Plus size={17} />New sale</button>
          <button className="btn w-full justify-start" onClick={() => navigate("/products")}><Plus size={17} />Add product</button>
          <button className="btn w-full justify-start" onClick={() => navigate("/printers")}>Printer settings</button>
        </div>
      </div>
    </div>
  </div>;
}

type Kind = "products" | "customers" | "shops" | "printers";
const labels: { [K in Kind]: string } = { products: "Products", customers: "Customers", shops: "Shops", printers: "Printers" };

export function EntityPage({ kind }: { kind: Kind }) {
  const store = useStore();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<any | false>(false);
  const [testing, setTesting] = useState<any | false>(false);
  const [testTemplateId, setTestTemplateId] = useState("");
  const [testBusy, setTestBusy] = useState(false);
  const [labelProduct, setLabelProduct] = useState<any | false>(false);
  const [labelPrinterId, setLabelPrinterId] = useState("");
  const [labelTemplateId, setLabelTemplateId] = useState("");
  const [labelBusy, setLabelBusy] = useState(false);
  const scanner = useRef({ value: "", started: 0, last: 0 });
  const items = (store[kind] as any[]).filter(value => `${value.name||""} ${value.phone||""} ${value.sku||""} ${value.barcode||""} ${value.category||""}`.toLowerCase().includes(query.toLowerCase()));
  const shop = store.shops.find(value => value.id === store.settings.activeShopId) || store.shops[0];
  const labelPrinters = store.printers.filter(value => value.printerType === "label");
  const productLabels = store.labels.filter(value => value.savedAt && (!value.shopId || value.shopId === shop?.id));
  const receiptTemplates = store.templates.filter(value => !shop || value.shopId === shop.id);
  useEffect(()=>{
    if(kind!=="products"||editing)return;
    const onKey=(event:KeyboardEvent)=>{
      const target=event.target as HTMLElement;if(["INPUT","TEXTAREA","SELECT"].includes(target.tagName)||target.isContentEditable)return;
      const time=Date.now(),state=scanner.current;
      if(event.key==="Enter"){
        const fast=state.value.length>=4&&time-state.last<250&&time-state.started<3000,code=state.value;scanner.current={value:"",started:0,last:0};
        if(!fast)return;
        const match=store.products.find(product=>product.barcode?.toLowerCase()===code.toLowerCase());
        if(match){event.preventDefault();setQuery(match.barcode||code)}
        return;
      }
      if(event.key.length!==1)return;
      if(time-state.last>250)scanner.current={value:event.key,started:time,last:time};else scanner.current={...state,value:state.value+event.key,last:time};
    };
    window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey);
  },[kind,editing,store.products]);

  const save = async (value: any) => {
    await store.upsert(kind as any, value);
    setEditing(false);
  };

  const remove = async (id: string) => {
    if (confirm("Delete this item? This cannot be undone.")) await store.remove(kind, id);
  };

  const openPrinterTest = (printer: any) => {
    setTesting(printer);
    setTestTemplateId(printer.printerType === "label"
      ? productLabels[0]?.id || ""
      : shop?.defaultTemplateId || receiptTemplates[0]?.id || "");
  };

  const openProductLabel = (product: any) => {
    setLabelProduct(product);
    setLabelPrinterId(labelPrinters[0]?.id || "");
    setLabelTemplateId(productLabels[0]?.id || "");
  };

  const printProductLabel = async () => {
    if (!labelProduct || !labelPrinterId || !labelTemplateId) return;
    setLabelBusy(true);
    try {
      const result = await window.receiptStudio.printProductLabel(labelProduct.id, labelTemplateId, labelPrinterId);
      alert(result.message || "Product label sent to printer.");
      setLabelProduct(false);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLabelBusy(false);
    }
  };

  const printTest = async () => {
    if (!testing || !testTemplateId) return;
    setTestBusy(true);
    try {
      const result = testing.printerType === "label"
        ? await window.receiptStudio.printLabelTest(testTemplateId, testing.id)
        : await window.receiptStudio.printTemplateTest(testing.id, testTemplateId);
      alert(result.message || `${testing.printerType === "label" ? "Product label" : "Receipt"} test sent to printer.`);
      setTesting(false);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setTestBusy(false);
    }
  };

  return <div className="max-w-[1280px] mx-auto">
    <div className="flex justify-between items-end mb-6">
      <div><p className="text-sm font-bold text-[#ff5f73] uppercase tracking-widest">Manage</p><h1 className="text-3xl font-black">{labels[kind]}</h1></div>
      <button className="btn btn-primary" onClick={() => setEditing({})}><Plus size={17} />Add {labels[kind].slice(0, -1).toLowerCase()}</button>
    </div>
    {kind === "products" && !productLabels.length && <div className="surface p-4 mb-4 bg-[#f5efff] border-[#d8c5f5] text-sm flex items-center justify-between">
      <span><b>Product labels are not set up.</b> Create a label template before printing price tags.</span>
      <button className="btn" onClick={() => location.hash = "#/labels"}><Tags size={15} />Create label template</button>
    </div>}
    <div className="surface">
      <div className="p-4 border-b flex justify-between">
        <div className="relative w-80">
          {kind==="products"?<Barcode size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#39786e] pointer-events-none" />:<Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a8581] pointer-events-none" />}
          <input className="input !pl-10" placeholder={kind==="products"?"Search name, SKU or scan barcode…":`Search ${kind}…`} value={query} onChange={event => setQuery(event.target.value)} />
        </div>
        {kind === "products" && <div className="flex gap-2"><button className="btn"><Upload size={16} />Import CSV</button><button className="btn"><Download size={16} />Export CSV</button></div>}
      </div>

      {!items.length
        ? <div className="p-6"><Empty title={`No ${kind} yet`} detail={`Add your first ${labels[kind].slice(0, -1).toLowerCase()} to get started.`} action={<button className="btn btn-primary" onClick={() => setEditing({})}><Plus size={16} />Add one</button>} /></div>
        : <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-[#77817e] bg-[#f7f7f3]">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">{kind === "products" ? "Category" : kind === "printers" ? "Connection" : "Details"}</th>
              <th className="p-4">{kind === "products" ? "Price / stock" : kind === "printers" ? "Paper" : kind === "customers" ? "Points" : "Updated"}</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">{items.map(value => <tr key={value.id} className="hover:bg-[#fafaf7]">
            <td className="p-4 font-bold">
              {value.name || value.phone}
              <div className="text-xs text-[#7d8784] font-normal">{value.sku || value.email || value.legalName || (kind === "printers" ? value.printerType === "label" ? "Label printer" : "Receipt printer" : "")}</div>
            </td>
            <td className="p-4">{value.category || value.connectionType || value.phone || value.addressLines?.[0] || "—"}</td>
            <td className="p-4">
              {kind === "products" && shop
                ? <><b>{formatMoney(value.price, shop.currency, shop.locale)}</b><div className="text-xs text-[#7d8784]">{value.stock} in stock</div></>
                : kind === "printers"
                  ? value.printerType === "label" ? `${value.paperWidthMm} × ${value.paperHeightMm} mm` : `${value.paperWidthMm} mm`
                  : kind === "customers"
                    ? <b>{value.pointsBalance||0}</b>
                  : new Date(value.updatedAt).toLocaleDateString()}
            </td>
            <td className="p-4">
              <div className="flex justify-end gap-2">
                {kind === "products" && productLabels.length > 0 && <button className="btn !py-1.5" onClick={() => openProductLabel(value)}><Printer size={15} />Print label</button>}
                {kind === "printers" && (value.printerType === "receipt" || productLabels.length > 0) && <button className="btn !py-1.5" onClick={() => openPrinterTest(value)}>Print test</button>}
                <button className="btn !p-2" onClick={() => setEditing(value)}><Edit3 size={15} /></button>
                <button className="btn btn-danger !p-2" onClick={() => void remove(value.id)}><Trash2 size={15} /></button>
              </div>
            </td>
          </tr>)}</tbody>
        </table>}
    </div>

    {editing && <Modal title={`${editing.id ? "Edit" : "Add"} ${labels[kind].slice(0, -1)}`} onClose={() => setEditing(false)}>
      {kind === "shops"
        ? <ShopForm value={editing.id ? editing : undefined} onSave={save} />
        : kind === "products"
          ? <ProductForm value={editing.id ? editing : undefined} shopId={shop?.id} products={store.products} onSave={save} />
          : kind === "customers"
            ? <CustomerForm value={editing.id ? editing : undefined} onSave={save} />
            : <PrinterForm value={editing.id ? editing : undefined} onSave={save} />}
    </Modal>}

    {labelProduct && <Modal title={`Print label — ${labelProduct.name}`} onClose={() => !labelBusy && setLabelProduct(false)}>
      <p className="text-sm text-[#68736f] mb-5">Choose a product-label template and a label printer. Product name, price, barcode, QR data, SKU, and stock fields will be filled automatically.</p>
      <div className="space-y-4">
        <label><span className="label">Label template</span><select autoFocus className="input" value={labelTemplateId} onChange={event => setLabelTemplateId(event.target.value)}><option value="">Choose template</option>{productLabels.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
        <label><span className="label">Label printer</span><select className="input" value={labelPrinterId} onChange={event => setLabelPrinterId(event.target.value)}><option value="">Choose label printer</option>{labelPrinters.map(printer => <option key={printer.id} value={printer.id}>{printer.name}</option>)}</select></label>
        {!labelPrinters.length && <p className="text-sm text-red-600">Add a printer profile with type “Label printer” before printing.</p>}
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button className="btn" disabled={labelBusy} onClick={() => setLabelProduct(false)}>Cancel</button>
        <button className="btn btn-primary" disabled={!labelTemplateId || !labelPrinterId || labelBusy} onClick={() => void printProductLabel()}>{labelBusy ? "Printing…" : "Print product label"}</button>
      </div>
    </Modal>}

    {testing && <Modal title={`Print test — ${testing.name}`} onClose={() => !testBusy && setTesting(false)}>
      <p className="text-sm text-[#68736f] mb-5">
        {testing.printerType === "label"
          ? "Choose a product-label template. Receipt Studio will fill it with sample product data and print it through this label printer."
          : "Choose a saved receipt template. Receipt Studio will print it with sample customer and sale data through this receipt printer. No sale will be saved."}
      </p>
      <label>
        <span className="label">{testing.printerType === "label" ? "Product-label template" : "Receipt template"}</span>
        <select autoFocus className="input" value={testTemplateId} onChange={event => setTestTemplateId(event.target.value)}>
          <option value="">Choose a template</option>
          {(testing.printerType === "label" ? productLabels : receiptTemplates).map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
        </select>
      </label>
      {!(testing.printerType === "label" ? productLabels : receiptTemplates).length && <p className="text-sm text-red-600 mt-3">Create and save a {testing.printerType === "label" ? "product-label" : "receipt"} template before printing a test.</p>}
      <div className="flex justify-end gap-2 mt-6">
        <button className="btn" disabled={testBusy} onClick={() => setTesting(false)}>Cancel</button>
        <button className="btn btn-primary" disabled={!testTemplateId || testBusy} onClick={() => void printTest()}>{testBusy ? "Printing…" : "Print selected template"}</button>
      </div>
    </Modal>}
  </div>;
}

export function SettingsPage() {
  const store = useStore();
  const [method, setMethod] = useState("");
  const addMethod = async () => {
    const value = method.trim();
    if (!value || store.settings.paymentMethods.some(item => item.toLowerCase() === value.toLowerCase())) return;
    await store.setSettings({ ...store.settings, paymentMethods: [...store.settings.paymentMethods, value] });
    setMethod("");
  };

  return <div className="max-w-3xl mx-auto">
    <p className="text-sm font-bold text-[#ff5f73] uppercase tracking-widest">Application</p>
    <h1 className="text-3xl font-black mb-7">Settings</h1>
    <div className="surface divide-y">
      {store.shops.length>0&&<LoyaltySettings shop={store.shops.find(value=>value.id===store.settings.activeShopId)||store.shops[0]} onSave={value=>store.upsert("shops",value)}/>}
      <section className="p-6">
        <h2 className="font-bold">Payment methods</h2>
        <p className="text-sm text-[#74807c] mb-4">These choices appear during checkout and on printed receipts.</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {store.settings.paymentMethods.map(item => <span key={item} className="inline-flex items-center gap-2 rounded-full bg-[#e7efec] px-3 py-1.5 text-sm font-semibold">
            {item}<button aria-label={`Remove ${item}`} disabled={store.settings.paymentMethods.length === 1} onClick={() => void store.setSettings({ ...store.settings, paymentMethods: store.settings.paymentMethods.filter(value => value !== item) })} className="text-[#8d453d] disabled:opacity-30">×</button>
          </span>)}
        </div>
        <div className="flex gap-2 max-w-md">
          <input className="input" placeholder="e.g. bKash, Bank Transfer" value={method} onChange={event => setMethod(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void addMethod(); } }} />
          <button className="btn btn-primary" onClick={() => void addMethod()}>Add</button>
        </div>
      </section>
      <section className="p-6">
        <h2 className="font-bold">Backup & restore</h2>
        <p className="text-sm text-[#74807c] mb-4">Export a complete copy of your local data or restore a validated backup.</p>
        <div className="flex gap-2">
          <button className="btn" onClick={() => void window.receiptStudio.exportBackup()}>Export backup</button>
          <button className="btn" onClick={async () => { if (confirm("Importing replaces current data after creating a safety backup. Continue?")) { await window.receiptStudio.importBackup(); await store.load(); } }}>Import backup</button>
        </div>
      </section>
      <section className="p-6">
        <h2 className="font-bold">Diagnostics</h2>
        <p className="text-sm text-[#74807c] mb-4">Logs never include full customer or sales records.</p>
        <div className="flex gap-2">
          <button className="btn" onClick={() => void window.receiptStudio.openLogs()}>Open logs folder</button>
          <button className="btn" onClick={async () => { await window.receiptStudio.diagnostics(); alert("Diagnostics copied"); }}>Copy diagnostics</button>
        </div>
      </section>
    </div>
  </div>;
}

function LoyaltySettings({shop,onSave}:{shop:Shop;onSave:(shop:Shop)=>void|Promise<void>}){
  const [value,setValue]=useState(shop.loyalty);
  const money=(amount:number)=>formatMoney(amount,shop.currency,shop.locale);
  return <section className="p-6">
    <h2 className="font-bold">Loyalty points</h2>
    <p className="text-sm text-[#74807c] mb-4">Configure earning and redemption for {shop.name}. Point changes are recorded with each sale, refund, or replacement.</p>
    <label className="flex items-center gap-2 mb-4"><input type="checkbox" checked={value.enabled} onChange={event=>setValue({...value,enabled:event.target.checked})}/> Enable loyalty points</label>
    <div className="grid grid-cols-2 gap-4">
      <label><span className="label">Spend amount ({shop.currency})</span><DraftNumberInput className="input" min=".01" step=".01" value={value.spendAmount/100} formatValue={amount=>amount.toFixed(2)} onValueChange={amount=>setValue({...value,spendAmount:Math.max(1,Math.round(amount*100))})}/></label>
      <label><span className="label">Points awarded</span><DraftNumberInput className="input" min="1" step="1" value={value.pointsAwarded} onValueChange={amount=>setValue({...value,pointsAwarded:Math.max(1,Math.floor(amount))})}/></label>
      <label><span className="label">Points to redeem</span><DraftNumberInput className="input" min="1" step="1" value={value.redemptionPoints} onValueChange={amount=>setValue({...value,redemptionPoints:Math.max(1,Math.floor(amount))})}/></label>
      <label><span className="label">Redemption value ({shop.currency})</span><DraftNumberInput className="input" min=".01" step=".01" value={value.redemptionValue/100} formatValue={amount=>amount.toFixed(2)} onValueChange={amount=>setValue({...value,redemptionValue:Math.max(1,Math.round(amount*100))})}/></label>
    </div>
    <p className="text-xs text-[#68736f] mt-3">Current rule: spend {money(value.spendAmount)} to earn {value.pointsAwarded} point{value.pointsAwarded===1?"":"s"}; {value.redemptionPoints} point{value.redemptionPoints===1?"":"s"} equals {money(value.redemptionValue)}.</p>
    <button className="btn btn-primary mt-4" onClick={async()=>{await onSave({...shop,loyalty:value,updatedAt:new Date().toISOString()});alert("Loyalty settings saved.")}}>Save loyalty settings</button>
  </section>
}
