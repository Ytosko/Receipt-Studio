import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Barcode } from "lucide-react";
import { DraftNumberInput, Field } from "./components";
import type {
  Customer,
  LabelTemplate,
  PrinterProfile,
  Product,
  Shop,
} from "../../shared/schemas";
const now = () => new Date().toISOString();
const blankProduct = (shopId?: string, barcode?: string): Product => ({
  id: crypto.randomUUID(),
  shopIds: shopId ? [shopId] : [],
  name: "",
  barcode,
  price: 0,
  stock: 0,
  isActive: true,
  createdAt: now(),
  updatedAt: now(),
});
export function ShopForm({
  value,
  onSave,
  dark = false,
}: {
  value?: Shop;
  onSave: (v: Shop) => void | Promise<void>;
  dark?: boolean;
}) {
  const [v, setV] = useState<Shop>(
    value || {
      id: crypto.randomUUID(),
      name: "",
      addressLines: [],
      currency: "USD",
      locale: "en-US",
      nextReceiptNumber: 1,
      archived: false,
      loyalty: {
        enabled: false,
        spendAmount: 50000,
        pointsAwarded: 1,
        redemptionPoints: 1,
        redemptionValue: 100,
      },
      createdAt: now(),
      updatedAt: now(),
    },
  );
  const [logo, setLogo] = useState("");
  useEffect(() => {
    if (v.logoAssetId)
      void window.receiptStudio
        .readShopLogo(v.logoAssetId)
        .then(setLogo)
        .catch(() => setLogo(""));
  }, [v.logoAssetId]);
  const input = dark
    ? "input !bg-[#183b35] !border-[#3b5d56] text-white"
    : "input";
  return (
    <form
      className="grid grid-cols-2 gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave({ ...v, updatedAt: now() });
      }}
    >
      <div className="col-span-2">
        <Field label="Shop logo">
          <div className="flex items-center gap-4">
            {logo ? (
              <img
                src={logo}
                alt="Shop logo preview"
                className="w-20 h-20 rounded-xl object-contain bg-white border p-2"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl border border-dashed flex items-center justify-center text-xs text-center opacity-70">
                No logo
              </div>
            )}
            <div className="space-y-2">
              <button
                type="button"
                className="btn"
                onClick={async () => {
                  const result = await window.receiptStudio.chooseShopLogo();
                  if (!result.canceled && result.assetId)
                    setV({ ...v, logoAssetId: result.assetId });
                }}
              >
                Choose image
              </button>
              {v.logoAssetId && (
                <button
                  type="button"
                  className="block text-sm text-red-400"
                  onClick={() => {
                    setV({ ...v, logoAssetId: undefined });
                    setLogo("");
                  }}
                >
                  Remove logo
                </button>
              )}
              <p className="text-xs opacity-60">
                PNG, JPEG, or WebP. Stored locally with your shop data.
              </p>
            </div>
          </div>
        </Field>
      </div>
      <div className="col-span-2">
        <Field label="Shop name">
          <input
            autoFocus
            required
            className={input}
            value={v.name}
            onChange={(e) => setV({ ...v, name: e.target.value })}
          />
        </Field>
      </div>
      <div className="col-span-2">
        <Field label="Address (one line per row)">
          <textarea
            className={input}
            rows={3}
            value={v.addressLines.join("\n")}
            onChange={(e) =>
              setV({ ...v, addressLines: e.target.value.split("\n") })
            }
          />
        </Field>
      </div>
      <Field label="Phone">
        <input
          className={input}
          value={v.phone || ""}
          onChange={(e) => setV({ ...v, phone: e.target.value })}
        />
      </Field>
      <Field label="Email">
        <input
          type="email"
          className={input}
          value={v.email || ""}
          onChange={(e) => setV({ ...v, email: e.target.value })}
        />
      </Field>
      <Field label="Currency">
        <input
          required
          maxLength={3}
          className={input}
          value={v.currency}
          onChange={(e) =>
            setV({ ...v, currency: e.target.value.toUpperCase() })
          }
        />
      </Field>
      <Field label="Locale">
        <input
          required
          className={input}
          value={v.locale}
          onChange={(e) => setV({ ...v, locale: e.target.value })}
        />
      </Field>
      <Field label="Receipt prefix">
        <input
          className={input}
          value={v.receiptPrefix || "R"}
          onChange={(e) => setV({ ...v, receiptPrefix: e.target.value })}
        />
      </Field>
      <Field label="Next number">
        <DraftNumberInput
          min={1}
          step={1}
          className={input}
          value={v.nextReceiptNumber}
          onValueChange={(value) =>
            setV({ ...v, nextReceiptNumber: Math.max(1, Math.floor(value)) })
          }
        />
      </Field>
      <button className="btn btn-primary col-span-2 mt-2" type="submit">
        {value ? "Save changes" : "Create shop & continue"}
      </button>
    </form>
  );
}
export function ProductForm({
  value,
  shopId,
  products = [],
  labelTemplates = [],
  labelPrinters = [],
  onSave,
  onSaveAndPrint,
  canPrintLabel = false,
}: {
  value?: Product;
  shopId?: string;
  products?: Product[];
  labelTemplates?: LabelTemplate[];
  labelPrinters?: PrinterProfile[];
  onSave: (v: Product) => void | Promise<void>;
  onSaveAndPrint?: (
    v: Product,
    selection: { labelId: string; printerId: string; copies: number },
  ) => void | Promise<void>;
  canPrintLabel?: boolean;
}) {
  const labelPreferenceKey = `receipt-studio:last-label-template:${shopId || "all"}`,
    preferredLabelId = (() => {
      try {
        const saved = localStorage.getItem(labelPreferenceKey);
        if (saved && labelTemplates.some((template) => template.id === saved))
          return saved;
      } catch {
        // A disabled browser storage area should not block product entry.
      }
      return labelTemplates[0]?.id || "";
    })();
  const [v, setV] = useState<Product>(value || blankProduct(shopId)),
    [receiving, setReceiving] = useState<Product>(),
    [quantityReceived, setQuantityReceived] = useState(1),
    [labelTemplateId, setLabelTemplateId] = useState(preferredLabelId),
    [labelCopies, setLabelCopies] = useState(1);
  const barcodeRef = useRef<HTMLInputElement>(null),
    latest = useRef(v),
    scanner = useRef<{
      value: string;
      started: number;
      last: number;
      original?: Product;
    }>({ value: "", started: 0, last: 0 }),
    [scanMessage, setScanMessage] = useState(
      "Scan a barcode from any field. It will not submit the form.",
    );
  latest.current = v;
  const selectedLabel = labelTemplates.find(
      (template) => template.id === labelTemplateId,
    ),
    assignedPrinter = labelPrinters.find(
      (printer) => printer.id === selectedLabel?.printerId,
    );
  const duplicate = v.barcode
    ? products.find(
        (product) =>
          product.id !== v.id &&
          product.barcode?.toLowerCase() === v.barcode?.trim().toLowerCase(),
      )
    : undefined;
  const applyBarcode = (code: string) => {
    const normalized = code.trim(),
      existing =
        !value?.id &&
        products.find(
          (product) =>
            product.barcode?.trim().toLowerCase() === normalized.toLowerCase(),
        );
    if (existing) {
      setReceiving(existing);
      setV({ ...existing });
      setQuantityReceived(1);
      setLabelCopies(1);
      setScanMessage(
        `${existing.name} found with ${existing.stock} in stock. Enter the received quantity below.`,
      );
      return;
    }
    setReceiving(undefined);
    setV(
      receiving
        ? blankProduct(shopId, normalized)
        : { ...latest.current, barcode: normalized },
    );
    setScanMessage(
      `Barcode ${normalized} captured. Review the product, then click Save product.`,
    );
  };
  const captureScan = (event: ReactKeyboardEvent<HTMLFormElement>) => {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    const time = Date.now(),
      state = scanner.current;
    if (event.key === "Enter" || event.key === "Tab") {
      const fast =
          state.value.length >= 4 &&
          time - state.last < 250 &&
          state.started > 0 &&
          time - state.started < 3000,
        code = state.value;
      scanner.current = { value: "", started: 0, last: 0 };
      if (!fast) return;
      event.preventDefault();
      event.stopPropagation();
      latest.current = state.original || latest.current;
      applyBarcode(code);
      window.setTimeout(() => barcodeRef.current?.focus(), 0);
      return;
    }
    if (event.key.length !== 1) return;
    if (!state.started || time - state.last >= 250)
      scanner.current = {
        value: event.key,
        started: time,
        last: time,
        original: { ...latest.current },
      };
    else
      scanner.current = {
        ...state,
        value: state.value + event.key,
        last: time,
      };
  };
  return (
    <form
      className="grid grid-cols-2 gap-4"
      onKeyDownCapture={captureScan}
      onSubmit={(e) => {
        e.preventDefault();
        if (duplicate)
          return alert(`Barcode already belongs to ${duplicate.name}.`);
        const action = (e.nativeEvent as SubmitEvent).submitter?.getAttribute(
          "data-action",
        );
        if (action === "save-print" && !assignedPrinter)
          return alert(
            "Choose a saved label template that has an assigned label printer.",
          );
        const product = {
          ...v,
          barcode: v.barcode?.trim(),
          stock: receiving
            ? receiving.stock + Math.max(1, Math.floor(quantityReceived))
            : v.stock,
          updatedAt: now(),
        };
        if (action === "save-print" && onSaveAndPrint)
          void onSaveAndPrint(product, {
            labelId: selectedLabel!.id,
            printerId: assignedPrinter!.id,
            copies: Math.max(1, Math.floor(labelCopies)),
          });
        else void onSave(product);
      }}
    >
      {receiving && (
        <div className="col-span-2 rounded-xl border border-[#b8d9cf] bg-[#edf7f4] p-4 text-sm text-[#244f48]">
          <b>Existing product found.</b> Receiving stock will update{" "}
          {receiving.name} instead of creating a duplicate product.
        </div>
      )}
      <div className="col-span-2">
        <Field label="Product name">
          <input
            autoFocus
            required
            className="input"
            value={v.name}
            onChange={(e) => setV({ ...v, name: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Price">
        <DraftNumberInput
          required
          min={0}
          step=".01"
          className="input"
          value={v.price / 100}
          formatValue={(value) => value.toFixed(2)}
          onValueChange={(value) =>
            setV({ ...v, price: Math.max(0, Math.round(value * 100)) })
          }
        />
      </Field>
      <Field label={receiving ? "Current stock" : "Stock quantity"}>
        {receiving ? (
          <input className="input" readOnly value={receiving.stock} />
        ) : (
          <DraftNumberInput
            required
            min={0}
            step={1}
            className="input"
            value={v.stock}
            onValueChange={(value) =>
              setV({ ...v, stock: Math.max(0, Math.floor(value)) })
            }
          />
        )}
      </Field>
      {receiving && (
        <Field label="Quantity received">
          <DraftNumberInput
            required
            min={1}
            step={1}
            className="input"
            value={quantityReceived}
            onValueChange={(value) => {
              const quantity = Math.max(1, Math.floor(value));
              setQuantityReceived(quantity);
              setLabelCopies(Math.min(999, quantity));
            }}
          />
        </Field>
      )}
      <Field label="SKU">
        <input
          className="input"
          value={v.sku || ""}
          onChange={(e) => setV({ ...v, sku: e.target.value })}
        />
      </Field>
      <div>
        <Field label="Barcode">
          <div className="flex gap-2">
            <input
              ref={barcodeRef}
              className="input"
              placeholder="Scan or enter barcode"
              value={v.barcode || ""}
              onChange={(e) => setV({ ...v, barcode: e.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !receiving && duplicate?.barcode) {
                  event.preventDefault();
                  applyBarcode(duplicate.barcode);
                }
              }}
              onBlur={(event) => {
                if (!value && !receiving && event.target.value.trim())
                  applyBarcode(event.target.value);
              }}
              readOnly={Boolean(receiving)}
            />
            <button
              type="button"
              className="btn !px-3"
              title="Focus barcode scanner"
              aria-label="Activate scanner input"
              onClick={() => barcodeRef.current?.focus()}
            >
              <Barcode size={17} />
            </button>
          </div>
          {duplicate && (
            <p className="text-xs text-[#9b4138] mt-1">
              Already used by {duplicate.name}
            </p>
          )}
          <p className="text-xs text-[#68736f] mt-1">{scanMessage}</p>
        </Field>
      </div>
      <Field label="Category">
        <input
          className="input"
          value={v.category || ""}
          onChange={(e) => setV({ ...v, category: e.target.value })}
        />
      </Field>
      <Field label="Tax rate %">
        <DraftNumberInput
          min={0}
          step=".01"
          className="input"
          value={v.taxRate || 0}
          onValueChange={(value) => setV({ ...v, taxRate: Math.max(0, value) })}
        />
      </Field>
      <div className="col-span-2">
        <Field label="Description">
          <textarea
            className="input"
            value={v.description || ""}
            onChange={(e) => setV({ ...v, description: e.target.value })}
          />
        </Field>
      </div>
      {canPrintLabel && (
        <div className="col-span-2 rounded-xl border border-[#deded6] bg-[#fafaf7] p-4">
          <p className="font-bold text-sm">Label printing</p>
          <p className="text-xs text-[#68736f] mt-1 mb-3">
            The assigned printer is selected automatically from the template.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Label template">
              <select
                className="input"
                value={labelTemplateId}
                onChange={(event) => {
                  const id = event.target.value;
                  setLabelTemplateId(id);
                  try {
                    localStorage.setItem(labelPreferenceKey, id);
                  } catch {
                    // The selection still works for this session.
                  }
                }}
              >
                {labelTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Labels to print">
              <DraftNumberInput
                min={1}
                max={999}
                step={1}
                className="input"
                value={labelCopies}
                onValueChange={(value) =>
                  setLabelCopies(Math.max(1, Math.min(999, Math.floor(value))))
                }
              />
            </Field>
          </div>
          <p className="text-xs text-[#68736f] mt-2">
            Printer: {assignedPrinter?.name || "No assigned label printer"}
          </p>
        </div>
      )}
      <div className="col-span-2 flex justify-end gap-2">
        {canPrintLabel && (
          <button
            type="submit"
            data-action="save-print"
            disabled={Boolean(duplicate) || !assignedPrinter}
            className="btn"
          >
            {receiving ? "Add stock & print labels" : "Save & print label"}
          </button>
        )}
        <button
          type="submit"
          disabled={Boolean(duplicate)}
          className="btn btn-primary"
        >
          {receiving ? "Add stock" : value ? "Save changes" : "Save product"}
        </button>
      </div>
    </form>
  );
}
export function CustomerForm({
  value,
  initialPhone = "",
  onSave,
}: {
  value?: Customer;
  initialPhone?: string;
  onSave: (v: Customer) => void | Promise<void>;
}) {
  const [v, setV] = useState<Customer>(
    value || {
      id: crypto.randomUUID(),
      name: "",
      phone: initialPhone,
      pointsBalance: 0,
      createdAt: now(),
      updatedAt: now(),
    },
  );
  return (
    <form
      className="grid grid-cols-2 gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave({
          ...v,
          phone: v.phone.trim(),
          name: v.name.trim(),
          updatedAt: now(),
        });
      }}
    >
      <div className="col-span-2">
        <Field label="Customer name (optional)">
          <input
            className="input"
            value={v.name}
            onChange={(e) => setV({ ...v, name: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Phone">
        <input
          autoFocus
          required
          className="input"
          value={v.phone}
          onChange={(e) => setV({ ...v, phone: e.target.value })}
        />
      </Field>
      <Field label="Email (optional)">
        <input
          type="email"
          className="input"
          value={v.email || ""}
          onChange={(e) => setV({ ...v, email: e.target.value })}
        />
      </Field>
      <div className="col-span-2">
        <Field label="Address (optional)">
          <textarea
            className="input"
            value={v.address || ""}
            onChange={(e) => setV({ ...v, address: e.target.value })}
          />
        </Field>
      </div>
      <div className="col-span-2">
        <Field label="Notes (optional)">
          <textarea
            className="input"
            value={v.notes || ""}
            onChange={(e) => setV({ ...v, notes: e.target.value })}
          />
        </Field>
      </div>
      <button className="btn btn-primary col-span-2">Save customer</button>
    </form>
  );
}
export function PrinterForm({
  value,
  onSave,
}: {
  value?: PrinterProfile;
  onSave: (v: PrinterProfile) => void | Promise<void>;
}) {
  const [v, setV] = useState<PrinterProfile>(
    value || {
      id: crypto.randomUUID(),
      name: "Receipt printer",
      printerType: "receipt",
      connectionType: "system",
      system: { deviceName: "" },
      paperWidthMm: 80,
      printableWidthMm: 72,
      characterWidth: 48,
      encoding: "Printer default",
      cutAfterPrint: true,
      openDrawerAfterPrint: false,
      feedLinesAfterPrint: 4,
      dpi: 203,
      orientation: "portrait",
      commandLanguage: "system",
      exactLabelSize: true,
      labelGapMm: 3,
      printSpeed: 4,
      darkness: 8,
      createdAt: now(),
      updatedAt: now(),
    },
  );
  const [devices, setDevices] = useState<
      Array<{ name: string; displayName: string }>
    >([]),
    [loading, setLoading] = useState(false);
  const refresh = async () => {
    setLoading(true);
    try {
      setDevices(await window.receiptStudio.listPrinters());
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (v.connectionType === "system") void refresh();
  }, [v.connectionType]);
  const labelPreset =
    (
      [
        [101.6, 152.4, "4 × 6 in"],
        [101.6, 101.6, "4 × 4 in"],
        [76.2, 50.8, "3 × 2 in"],
        [50.8, 38.1, "2 × 1.5 in"],
        [50.8, 25.4, "2 × 1 in"],
        [50, 25, "50 × 25 mm"],
        [40, 30, "40 × 30 mm"],
      ] as const
    ).find(
      ([w, h]) =>
        Math.abs(v.paperWidthMm - w) < 0.05 &&
        Math.abs((v.paperHeightMm || 0) - h) < 0.05,
    )?.[2] || "custom";
  const setLabelPreset = (name: string) => {
    const p = (
      [
        [101.6, 152.4, "4 × 6 in"],
        [101.6, 101.6, "4 × 4 in"],
        [76.2, 50.8, "3 × 2 in"],
        [50.8, 38.1, "2 × 1.5 in"],
        [50.8, 25.4, "2 × 1 in"],
        [50, 25, "50 × 25 mm"],
        [40, 30, "40 × 30 mm"],
      ] as const
    ).find((x) => x[2] === name);
    if (p)
      setV({
        ...v,
        paperWidthMm: p[0],
        paperHeightMm: p[1],
        printableWidthMm: p[0],
      });
  };
  return (
    <form
      className="grid grid-cols-2 gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave({ ...v, updatedAt: now() });
      }}
    >
      <div className="col-span-2">
        <Field label="Profile name">
          <input
            required
            className="input"
            value={v.name}
            onChange={(e) => setV({ ...v, name: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Printer type">
        <select
          className="input"
          value={v.printerType}
          onChange={(e) => {
            const printerType = e.target.value as "receipt" | "label";
            setV({
              ...v,
              printerType,
              commandLanguage:
                printerType === "receipt"
                  ? "escpos"
                  : v.connectionType === "system"
                    ? "system"
                    : "zpl",
              paperWidthMm: printerType === "receipt" ? 80 : 101.6,
              paperHeightMm: printerType === "receipt" ? undefined : 152.4,
              printableWidthMm: printerType === "receipt" ? 72 : 101.6,
            });
          }}
        >
          <option value="receipt">Receipt printer</option>
          <option value="label">Label printer</option>
        </select>
      </Field>
      <Field label="Connection">
        <select
          className="input"
          value={v.connectionType}
          onChange={(e) => {
            const connectionType = e.target.value as "network" | "system";
            setV({
              ...v,
              connectionType,
              commandLanguage:
                connectionType === "system"
                  ? "system"
                  : v.printerType === "label"
                    ? "zpl"
                    : "escpos",
            });
          }}
        >
          <option value="network">Network (raw TCP)</option>
          <option value="system">Windows / USB system printer</option>
        </select>
      </Field>
      {v.connectionType === "network" ? (
        <>
          <Field label="IP / host">
            <input
              required
              className="input"
              value={v.network?.host || ""}
              onChange={(e) =>
                setV({
                  ...v,
                  network: {
                    host: e.target.value,
                    port: v.network?.port || 9100,
                    timeoutMs: v.network?.timeoutMs || 5000,
                  },
                })
              }
            />
          </Field>
          <Field label="Port">
            <DraftNumberInput
              className="input"
              min={1}
              max={65535}
              step={1}
              value={v.network?.port || 9100}
              onValueChange={(value) =>
                setV({
                  ...v,
                  network: {
                    host: v.network?.host || "",
                    port: Math.floor(value),
                    timeoutMs: v.network?.timeoutMs || 5000,
                  },
                })
              }
            />
          </Field>
          <Field label="Timeout (ms)">
            <DraftNumberInput
              className="input"
              min={100}
              step={100}
              value={v.network?.timeoutMs || 5000}
              onValueChange={(value) =>
                setV({
                  ...v,
                  network: {
                    host: v.network?.host || "",
                    port: v.network?.port || 9100,
                    timeoutMs: Math.floor(value),
                  },
                })
              }
            />
          </Field>
          <Field label="Command language">
            <select
              className="input"
              value={v.commandLanguage}
              onChange={(e) =>
                setV({
                  ...v,
                  commandLanguage: e.target
                    .value as PrinterProfile["commandLanguage"],
                })
              }
            >
              {v.printerType === "receipt" ? (
                <option value="escpos">ESC/POS</option>
              ) : (
                <>
                  <option value="zpl">ZPL</option>
                  <option value="tspl">TSPL / TSPL2</option>
                </>
              )}
            </select>
          </Field>
        </>
      ) : (
        <div className="col-span-2">
          <Field label="Installed Windows / USB printer">
            <div className="flex gap-2">
              <select
                required
                className="input"
                value={v.system?.deviceName || ""}
                onChange={(e) =>
                  setV({ ...v, system: { deviceName: e.target.value } })
                }
              >
                <option value="">Choose installed printer</option>
                {devices.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.displayName || d.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn whitespace-nowrap"
                onClick={() => void refresh()}
              >
                {loading ? "Refreshing…" : "Refresh printers"}
              </button>
            </div>
          </Field>
        </div>
      )}
      {v.printerType === "receipt" ? (
        <>
          <Field label="Paper preset">
            <select
              className="input"
              value={
                v.paperWidthMm === 80
                  ? "80"
                  : v.paperWidthMm === 58
                    ? "58"
                    : "custom"
              }
              onChange={(e) => {
                const width = Number(e.target.value);
                if (width)
                  setV({
                    ...v,
                    paperWidthMm: width,
                    printableWidthMm: width === 80 ? 72 : 48,
                    characterWidth: width === 80 ? 48 : 32,
                  });
              }}
            >
              <option value="80">80 mm receipt</option>
              <option value="58">58 mm receipt</option>
              <option value="custom">Custom</option>
            </select>
          </Field>
          <Field label="Paper width (mm)">
            <DraftNumberInput
              className="input"
              step=".1"
              value={v.paperWidthMm}
              onValueChange={(value) => setV({ ...v, paperWidthMm: value })}
            />
          </Field>
          <Field label="Printable width (mm)">
            <DraftNumberInput
              className="input"
              step=".1"
              value={v.printableWidthMm}
              onValueChange={(value) => setV({ ...v, printableWidthMm: value })}
            />
          </Field>
          <Field label="Characters / line">
            <DraftNumberInput
              className="input"
              min={16}
              max={100}
              step={1}
              value={v.characterWidth}
              onValueChange={(value) =>
                setV({ ...v, characterWidth: Math.floor(value) })
              }
            />
          </Field>
          <Field label="Encoding">
            <select
              className="input"
              value={v.encoding}
              onChange={(e) => setV({ ...v, encoding: e.target.value })}
            >
              {[
                "Printer default",
                "CP437",
                "CP850",
                "CP852",
                "CP858",
                "CP860",
                "CP863",
                "CP865",
                "Windows-1252",
                "ISO-8859-1",
                "GB18030",
                "Big5",
                "Shift-JIS",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Feed lines">
            <DraftNumberInput
              className="input"
              min={0}
              max={20}
              step={1}
              value={v.feedLinesAfterPrint}
              onValueChange={(value) =>
                setV({ ...v, feedLinesAfterPrint: Math.floor(value) })
              }
            />
          </Field>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={v.cutAfterPrint}
              onChange={(e) => setV({ ...v, cutAfterPrint: e.target.checked })}
            />{" "}
            Cut after print
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={v.openDrawerAfterPrint}
              onChange={(e) =>
                setV({ ...v, openDrawerAfterPrint: e.target.checked })
              }
            />{" "}
            Open cash drawer
          </label>
        </>
      ) : (
        <>
          <div className="col-span-2">
            <Field label="Label size preset">
              <select
                className="input"
                value={labelPreset}
                onChange={(e) => setLabelPreset(e.target.value)}
              >
                <option>4 × 6 in</option>
                <option>4 × 4 in</option>
                <option>3 × 2 in</option>
                <option>2 × 1.5 in</option>
                <option>2 × 1 in</option>
                <option>50 × 25 mm</option>
                <option>40 × 30 mm</option>
                <option value="custom">Custom size</option>
              </select>
            </Field>
          </div>
          <Field label="Sheet width (mm)">
            <DraftNumberInput
              required
              className="input"
              step=".1"
              min={5}
              value={v.paperWidthMm}
              onValueChange={(value) =>
                setV({ ...v, paperWidthMm: value, printableWidthMm: value })
              }
            />
          </Field>
          <Field label="Sheet height (mm)">
            <DraftNumberInput
              required
              className="input"
              step=".1"
              min={5}
              value={v.paperHeightMm || 0}
              onValueChange={(value) => setV({ ...v, paperHeightMm: value })}
            />
          </Field>
          <Field label="Resolution">
            <select
              className="input"
              value={v.dpi}
              onChange={(e) =>
                setV({ ...v, dpi: Number(e.target.value) as 203 | 300 | 600 })
              }
            >
              <option value={203}>203 DPI</option>
              <option value={300}>300 DPI</option>
              <option value={600}>600 DPI</option>
            </select>
          </Field>
          <Field label="Orientation">
            <select
              className="input"
              value={v.orientation}
              onChange={(e) =>
                setV({
                  ...v,
                  orientation: e.target.value as "portrait" | "landscape",
                })
              }
            >
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </Field>
          <Field label="Label gap (mm)">
            <DraftNumberInput
              className="input"
              step=".1"
              min={0}
              value={v.labelGapMm}
              onValueChange={(value) => setV({ ...v, labelGapMm: value })}
            />
          </Field>
          <Field label="Darkness">
            <DraftNumberInput
              className="input"
              min={0}
              max={30}
              value={v.darkness}
              onValueChange={(value) => setV({ ...v, darkness: value })}
            />
          </Field>
          {v.connectionType === "system" && (
            <div className="col-span-2 rounded-xl border border-[#d6ddd9] bg-[#f5f7f5] p-3">
              <label className="flex items-start gap-2">
                <input
                  className="mt-1"
                  type="checkbox"
                  checked={v.exactLabelSize}
                  onChange={(event) =>
                    setV({ ...v, exactLabelSize: event.target.checked })
                  }
                />
                <span>
                  <b className="block text-sm">
                    Print silently at the template’s exact size
                  </b>
                  <span className="block text-xs text-[#68736f] mt-1">
                    Recommended for Windows/USB label printers. Turning this off
                    opens the Windows dialog, where the driver may replace the
                    custom label size with its default paper.
                  </span>
                  <span className="block text-xs text-[#7a5b24] mt-2">
                    If the first job advances a blank label, put the printer in
                    label mode and calibrate its gap sensor after loading a new
                    roll or changing label size.
                  </span>
                </span>
              </label>
            </div>
          )}
        </>
      )}
      <button className="btn btn-primary col-span-2">Save printer</button>
    </form>
  );
}
