import { useEffect, useRef, useState } from "react";
import { Barcode as BarcodeIcon, Box, Grip, Minus, Package, Plus, Printer, QrCode, Type } from "lucide-react";
import QRCode from "qrcode";
import bwipjs from "bwip-js/browser";
import type { LabelElement, LabelTemplate } from "../../shared/schemas";
import { bindProductLabel, productPriceTagElements, sampleLabelProduct } from "../../shared/productLabel";
import { Empty, Field } from "./components";
import { useStore } from "./store";

const now = () => new Date().toISOString();
const presets = [
  [101.6, 152.4, "4 × 6 in"],
  [101.6, 101.6, "4 × 4 in"],
  [76.2, 50.8, "3 × 2 in"],
  [50.8, 38.1, "2 × 1.5 in"],
  [50.8, 25.4, "2 × 1 in"],
  [50, 25, "50 × 25 mm"],
  [40, 30, "40 × 30 mm"]
] as const;

const bindingLabels: Record<NonNullable<LabelElement["binding"]>, string> = {
  productName: "Product name",
  productPrice: "Product price",
  productSku: "Product SKU",
  productBarcode: "Product barcode",
  productStock: "Stock quantity",
  productQr: "Product QR data"
};

function Barcode({ element }: { element: LabelElement }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      bwipjs.toCanvas(ref.current, {
        bcid: element.barcodeFormat,
        text: element.text || "123456789012",
        scale: 2,
        height: 10,
        includetext: true,
        textxalign: "center"
      });
    } catch {
      const context = ref.current.getContext("2d");
      if (context) {
        context.clearRect(0, 0, ref.current.width, ref.current.height);
        context.fillText("Invalid barcode value", 4, 18);
      }
    }
  }, [element]);
  return <canvas ref={ref} className="w-full h-full object-fill" />;
}

function Qr({ value }: { value: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    void QRCode.toDataURL(value || "Label", { margin: 1, width: 240 }).then(setSrc);
  }, [value]);
  return src ? <img src={src} className="w-full h-full object-contain [image-rendering:pixelated]" alt="QR code" /> : null;
}

export function LabelsPage() {
  const store = useStore();
  const [selectedId, setSelectedId] = useState(store.labels[0]?.id || "");
  const [draft, setDraft] = useState<LabelTemplate | undefined>(store.labels[0]);
  const [selected, setSelected] = useState("");
  const [saved, setSaved] = useState(true);
  const [printerId, setPrinterId] = useState("");
  const [printing, setPrinting] = useState(false);
  const [gesture, setGesture] = useState<{
    id: string;
    mode: "move" | "resize";
    cx: number;
    cy: number;
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const upsert = store.upsert;
  const scale = 4;
  const active = draft?.elements.find(element => element.id === selected);
  const shop = store.shops.find(value => value.id === draft?.shopId)
    || store.shops.find(value => value.id === store.settings.activeShopId)
    || store.shops[0];
  const preview = draft ? bindProductLabel(draft, sampleLabelProduct, shop) : undefined;
  const labelPrinters = store.printers.filter(printer => printer.printerType === "label");

  useEffect(() => {
    const value = useStore.getState().labels.find(label => label.id === selectedId);
    if (value) {
      setDraft(value);
      setSaved(true);
      setSelected("");
    }
  }, [selectedId]);

  useEffect(() => {
    if (saved || !draft) return;
    const timer = window.setTimeout(() => {
      const value = { ...draft, updatedAt: now() };
      void upsert("labels", value).then(() => {
        setDraft(value);
        setSaved(true);
      });
    }, 700);
    return () => clearTimeout(timer);
  }, [draft, saved, upsert]);

  const mutate = (change: (value: LabelTemplate) => LabelTemplate) => {
    if (draft) {
      setDraft(change(draft));
      setSaved(false);
    }
  };

  const create = async () => {
    const value: LabelTemplate = {
      id: crypto.randomUUID(),
      name: `Product price tag ${store.labels.length + 1}`,
      shopId: store.settings.activeShopId,
      widthMm: 50,
      heightMm: 25,
      dpi: 203,
      orientation: "portrait",
      elements: productPriceTagElements(),
      createdAt: now(),
      updatedAt: now()
    };
    await store.upsert("labels", value);
    setSelectedId(value.id);
    setDraft(value);
    setSaved(true);
  };

  const add = (type: LabelElement["type"], binding?: LabelElement["binding"]) => {
    const width = draft?.widthMm || 50;
    const value: LabelElement = {
      id: crypto.randomUUID(),
      type,
      x: 3,
      y: 3,
      width: type === "qrcode" ? 12 : Math.min(34, width - 6),
      height: type === "barcode" ? 9 : type === "qrcode" ? 12 : type === "line" ? 0.5 : 5,
      text: type === "text" && !binding ? "Custom text" : "",
      binding,
      fontSize: binding === "productPrice" ? 16 : binding === "productStock" ? 9 : 13,
      bold: binding === "productName" || binding === "productPrice",
      rotation: 0,
      barcodeFormat: "code128"
    };
    mutate(current => ({ ...current, elements: [...current.elements, value] }));
    setSelected(value.id);
  };

  const updateElement = (patch: Partial<LabelElement>) => {
    mutate(current => ({
      ...current,
      elements: current.elements.map(element => element.id === selected ? { ...element, ...patch } : element)
    }));
  };

  const printTest = async () => {
    if (!draft || !printerId) return;
    setPrinting(true);
    try {
      const value = { ...draft, updatedAt: now() };
      await store.upsert("labels", value);
      setDraft(value);
      setSaved(true);
      const result = await window.receiptStudio.printLabelTest(value.id, printerId);
      alert(result.message || "Product label test sent to printer.");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setPrinting(false);
    }
  };

  if (!draft) {
    return <Empty
      title="No product label templates"
      detail="Create a price-tag template before printing labels from the Products page."
      action={<button className="btn btn-primary" onClick={() => void create()}><Plus size={16} />Create product label</button>}
    />;
  }

  const pointerMove = (event: React.PointerEvent) => {
    if (!gesture) return;
    const dx = (event.clientX - gesture.cx) / scale;
    const dy = (event.clientY - gesture.cy) / scale;
    if (gesture.mode === "move") {
      updateElement({
        x: Math.max(0, Math.min(draft.widthMm - 3, gesture.x + dx)),
        y: Math.max(0, Math.min(draft.heightMm - 1, gesture.y + dy))
      });
    } else {
      updateElement({
        width: Math.max(3, Math.min(draft.widthMm - gesture.x, gesture.w + dx)),
        height: Math.max(0.5, Math.min(draft.heightMm - gesture.y, gesture.h + dy))
      });
    }
  };

  return <div className="-m-7 h-[calc(100%+3.5rem)] min-h-[720px] flex flex-col">
    <header className="h-16 bg-white border-b flex items-center gap-3 px-5">
      <select className="input !w-52" value={selectedId} onChange={event => setSelectedId(event.target.value)}>
        {store.labels.map(label => <option key={label.id} value={label.id}>{label.name}</option>)}
      </select>
      <input className="input !w-56 font-bold" value={draft.name} onChange={event => mutate(value => ({ ...value, name: event.target.value }))} />
      <span className="text-xs text-[#64746f]">{saved ? "Saved locally" : "Autosaving…"}</span>
      <button className="btn ml-2" onClick={() => void create()}><Plus size={15} />New</button>
      <div className="ml-auto flex items-center gap-2">
        <select className="input !w-52" value={printerId} onChange={event => setPrinterId(event.target.value)}>
          <option value="">Choose label printer</option>
          {labelPrinters.map(printer => <option key={printer.id} value={printer.id}>{printer.name}</option>)}
        </select>
        <button className="btn btn-primary" disabled={!printerId || printing} onClick={() => void printTest()}>
          <Printer size={16} />{printing ? "Printing…" : "Print test"}
        </button>
      </div>
    </header>

    <div className="grid grid-cols-[220px_1fr_300px] flex-1 min-h-0">
      <aside className="bg-[#f7f6f1] border-r p-4 overflow-auto">
        <p className="label">Product fields</p>
        <div className="space-y-2">
          <button className="btn w-full justify-start" onClick={() => add("text", "productName")}><Package size={16} />Product name</button>
          <button className="btn w-full justify-start" onClick={() => add("text", "productPrice")}><Type size={16} />Product price</button>
          <button className="btn w-full justify-start" onClick={() => add("text", "productSku")}><Type size={16} />Product SKU</button>
          <button className="btn w-full justify-start" onClick={() => add("text", "productStock")}><Type size={16} />Stock quantity</button>
          <button className="btn w-full justify-start" onClick={() => add("barcode", "productBarcode")}><BarcodeIcon size={16} />Product barcode</button>
          <button className="btn w-full justify-start" onClick={() => add("qrcode", "productQr")}><QrCode size={16} />Product QR code</button>
        </div>
        <p className="label mt-6">Layout</p>
        <div className="space-y-2">
          <button className="btn w-full justify-start" onClick={() => add("text")}><Type size={16} />Custom text</button>
          <button className="btn w-full justify-start" onClick={() => add("line")}><Minus size={16} />Divider</button>
          <button className="btn w-full justify-start" onClick={() => add("box")}><Box size={16} />Box</button>
          <button className="btn w-full justify-start" onClick={() => add("barcode")}><Grip size={16} />Custom barcode</button>
          <button className="btn w-full justify-start" onClick={() => add("qrcode")}><QrCode size={16} />Custom QR code</button>
        </div>
        <p className="text-xs text-[#6c7773] mt-6">Product fields are filled automatically when a label is printed from the Products page. The canvas uses sample product data.</p>
      </aside>

      <main
        className="bg-[#d6d7d2] overflow-auto p-10 flex justify-center items-start"
        onPointerMove={pointerMove}
        onPointerUp={() => setGesture(null)}
        onPointerLeave={() => setGesture(null)}
      >
        <div className="bg-white shadow-xl relative touch-none" style={{ width: draft.widthMm * scale, height: draft.heightMm * scale }}>
          {draft.elements.map(element => {
            const display = preview?.elements.find(value => value.id === element.id) || element;
            return <div
              key={element.id}
              onPointerDown={event => {
                event.currentTarget.setPointerCapture(event.pointerId);
                setSelected(element.id);
                setGesture({ id: element.id, mode: "move", cx: event.clientX, cy: event.clientY, x: element.x, y: element.y, w: element.width, h: element.height });
              }}
              className={`absolute overflow-hidden ${selected === element.id ? "outline outline-2 outline-[#6b25e9] outline-offset-2" : "hover:outline hover:outline-1 hover:outline-[#a98ae8]"}`}
              style={{ left: element.x * scale, top: element.y * scale, width: element.width * scale, height: element.height * scale, transform: `rotate(${element.rotation}deg)`, fontSize: element.fontSize, fontWeight: element.bold ? 700 : 400 }}
            >
              {element.type === "text" && <div className="w-full h-full">{display.text}</div>}
              {element.type === "barcode" && <Barcode element={display} />}
              {element.type === "qrcode" && <Qr value={display.text} />}
              {element.type === "box" && <div className="w-full h-full border-2 border-black" />}
              {element.type === "line" && <div className="w-full border-t-2 border-black mt-1" />}
              <span
                onPointerDown={event => {
                  event.stopPropagation();
                  setGesture({ id: element.id, mode: "resize", cx: event.clientX, cy: event.clientY, x: element.x, y: element.y, w: element.width, h: element.height });
                }}
                className={`${selected === element.id ? "block" : "hidden"} absolute right-0 bottom-0 w-3 h-3 bg-[#6b25e9] cursor-se-resize`}
              />
            </div>;
          })}
        </div>
      </main>

      <aside className="bg-white border-l p-5 overflow-auto">
        <p className="label">Sheet</p>
        <div className="space-y-3">
          <Field label="Size preset">
            <select
              className="input"
              value={presets.find(value => Math.abs(value[0] - draft.widthMm) < .05 && Math.abs(value[1] - draft.heightMm) < .05)?.[2] || "custom"}
              onChange={event => {
                const preset = presets.find(value => value[2] === event.target.value);
                if (preset) mutate(value => ({ ...value, widthMm: preset[0], heightMm: preset[1] }));
              }}
            >
              {presets.map(value => <option key={value[2]}>{value[2]}</option>)}
              <option value="custom">Custom size</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Width mm"><input className="input" type="number" step=".1" min="5" value={draft.widthMm} onChange={event => mutate(value => ({ ...value, widthMm: Number(event.target.value) }))} /></Field>
            <Field label="Height mm"><input className="input" type="number" step=".1" min="5" value={draft.heightMm} onChange={event => mutate(value => ({ ...value, heightMm: Number(event.target.value) }))} /></Field>
          </div>
          <Field label="DPI">
            <select className="input" value={draft.dpi} onChange={event => mutate(value => ({ ...value, dpi: Number(event.target.value) as 203 | 300 | 600 }))}>
              <option>203</option><option>300</option><option>600</option>
            </select>
          </Field>
        </div>

        {active && <div className="border-t mt-5 pt-5 space-y-3">
          <div className="flex justify-between">
            <b className="capitalize">{active.type === "line" ? "Divider" : active.type}</b>
            <button className="text-sm text-red-600" onClick={() => mutate(value => ({ ...value, elements: value.elements.filter(element => element.id !== active.id) }))}>Delete</button>
          </div>
          {["text", "barcode", "qrcode"].includes(active.type) && <Field label="Data source">
            <select className="input" value={active.binding || "custom"} onChange={event => updateElement({ binding: event.target.value === "custom" ? undefined : event.target.value as LabelElement["binding"] })}>
              <option value="custom">Custom value</option>
              {Object.entries(bindingLabels)
                .filter(([binding]) => active.type === "text" ? !["productBarcode", "productQr"].includes(binding) : active.type === "barcode" ? binding === "productBarcode" : binding === "productQr")
                .map(([binding, label]) => <option key={binding} value={binding}>{label}</option>)}
            </select>
          </Field>}
          {["text", "barcode", "qrcode"].includes(active.type) && !active.binding && <Field label={active.type === "text" ? "Text" : "Value"}>
            <textarea className="input" value={active.text} onChange={event => updateElement({ text: event.target.value })} />
          </Field>}
          {active.binding && <p className="text-xs rounded-lg bg-[#f2ecfb] p-2 text-[#5d3b82]">Preview: {preview?.elements.find(value => value.id === active.id)?.text}</p>}
          {active.type === "barcode" && <Field label="Barcode format">
            <select className="input" value={active.barcodeFormat} onChange={event => updateElement({ barcodeFormat: event.target.value as LabelElement["barcodeFormat"] })}>
              <option value="code128">Code 128</option>
              <option value="code39">Code 39</option>
              <option value="ean13">EAN-13</option>
              <option value="upca">UPC-A</option>
            </select>
          </Field>}
          <div className="grid grid-cols-2 gap-2">
            <Field label="X mm"><input className="input" type="number" step=".1" value={active.x.toFixed(1)} onChange={event => updateElement({ x: Number(event.target.value) })} /></Field>
            <Field label="Y mm"><input className="input" type="number" step=".1" value={active.y.toFixed(1)} onChange={event => updateElement({ y: Number(event.target.value) })} /></Field>
            <Field label="Width mm"><input className="input" type="number" step=".1" value={active.width.toFixed(1)} onChange={event => updateElement({ width: Number(event.target.value) })} /></Field>
            <Field label="Height mm"><input className="input" type="number" step=".1" value={active.height.toFixed(1)} onChange={event => updateElement({ height: Number(event.target.value) })} /></Field>
          </div>
          {active.type === "text" && <>
            <Field label="Font size"><input className="input" type="number" value={active.fontSize} onChange={event => updateElement({ fontSize: Number(event.target.value) })} /></Field>
            <label className="flex gap-2"><input type="checkbox" checked={active.bold} onChange={event => updateElement({ bold: event.target.checked })} />Bold</label>
          </>}
          <Field label="Rotation">
            <select className="input" value={active.rotation} onChange={event => updateElement({ rotation: Number(event.target.value) as 0 | 90 | 180 | 270 })}>
              <option>0</option><option>90</option><option>180</option><option>270</option>
            </select>
          </Field>
        </div>}
      </aside>
    </div>
  </div>;
}
