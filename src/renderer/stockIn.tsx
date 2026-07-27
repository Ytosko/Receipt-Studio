import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Barcode, CheckCircle2, Plus, Printer } from "lucide-react";
import type {
  LabelTemplate,
  PrinterProfile,
  Product,
} from "../../shared/schemas";
import { DraftNumberInput, Field } from "./components";

export type StockInPrintSelection = {
  labelId: string;
  printerId: string;
  copies: number;
};

export type StockInResult = {
  newStock: number;
  printMessage?: string;
  printError?: string;
};

type Activity = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  newStock: number;
  printMessage?: string;
  printError?: string;
};

export function RapidStockIn({
  shopId,
  products,
  labelTemplates,
  labelPrinters,
  onReceive,
  onCreateProduct,
}: {
  shopId?: string;
  products: Product[];
  labelTemplates: LabelTemplate[];
  labelPrinters: PrinterProfile[];
  onReceive: (
    product: Product,
    quantity: number,
    selection?: StockInPrintSelection,
  ) => Promise<StockInResult>;
  onCreateProduct: (barcode: string) => void;
}) {
  const preferenceKey = `receipt-studio:last-label-template:${shopId || "all"}`,
    preferredTemplateId = (() => {
      try {
        const saved = localStorage.getItem(preferenceKey);
        if (saved && labelTemplates.some((template) => template.id === saved))
          return saved;
      } catch {
        // Browser storage is only a convenience; scanning must still work.
      }
      return labelTemplates[0]?.id || "";
    })();
  const [query, setQuery] = useState(""),
    [quantity, setQuantity] = useState(1),
    [printLabels, setPrintLabels] = useState(false),
    [templateId, setTemplateId] = useState(preferredTemplateId),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState<{
      text: string;
      error?: boolean;
    }>({
      text: "Scan an existing barcode to add stock immediately.",
    }),
    [activities, setActivities] = useState<Activity[]>([]);
  const inputRef = useRef<HTMLInputElement>(null),
    scanner = useRef({ value: "", started: 0, last: 0 }),
    lastAcceptedScan = useRef({ barcode: "", at: 0, window: 700 });

  const selectedTemplate = labelTemplates.find(
      (template) => template.id === templateId,
    ),
    assignedPrinter = labelPrinters.find(
      (printer) => printer.id === selectedTemplate?.printerId,
    ),
    normalized = query.trim().toLowerCase(),
    matches = normalized
      ? products
          .filter((product) =>
            `${product.barcode || ""} ${product.sku || ""} ${product.name}`
              .toLowerCase()
              .includes(normalized),
          )
          .sort((a, b) => {
            const score = (product: Product) => {
              if (product.barcode?.toLowerCase() === normalized) return 0;
              if (product.barcode?.toLowerCase().startsWith(normalized))
                return 1;
              if (product.sku?.toLowerCase() === normalized) return 2;
              if (product.name.toLowerCase().startsWith(normalized)) return 3;
              return 4;
            };
            return score(a) - score(b) || a.name.localeCompare(b.name);
          })
          .slice(0, 10)
      : [];

  const refocus = () =>
    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);

  useEffect(() => {
    if (!busy) refocus();
  }, [busy]);

  const receive = async (
    product: Product,
    barcode: string,
    scannerTriggered: boolean,
  ) => {
    if (busy) return;
    const received = Math.max(1, Math.min(999, Math.floor(quantity)));
    if (scannerTriggered) {
      const time = Date.now();
      if (
        lastAcceptedScan.current.barcode === barcode &&
        time - lastAcceptedScan.current.at < lastAcceptedScan.current.window
      ) {
        // Sliding window: while the item stays under the scanner, keep
        // ignoring re-reads until it has been away for a full window.
        lastAcceptedScan.current.at = time;
        setMessage({
          text: `Ignored a duplicate read of ${barcode}. Remove the item, then scan again to add more.`,
        });
        setQuery("");
        refocus();
        return;
      }
      lastAcceptedScan.current = {
        barcode,
        at: time,
        window: printLabels ? 2000 : 700,
      };
    }
    if (printLabels && (!selectedTemplate || !assignedPrinter)) {
      setMessage({
        text: "Choose a template with an assigned label printer before enabling automatic printing.",
        error: true,
      });
      refocus();
      return;
    }
    setBusy(true);
    try {
      const result = await onReceive(
        product,
        received,
        printLabels
          ? {
              labelId: selectedTemplate!.id,
              printerId: assignedPrinter!.id,
              copies: received,
            }
          : undefined,
      );
      setActivities((current) => {
        // One row per product: accumulate the quantity and keep the
        // latest stock level instead of appending a row per scan.
        const existing = current.find(
          (activity) => activity.productId === product.id,
        );
        return [
          {
            id: existing?.id || crypto.randomUUID(),
            productId: product.id,
            productName: product.name,
            quantity: (existing?.quantity || 0) + received,
            newStock: result.newStock,
            printMessage: result.printMessage || existing?.printMessage,
            printError: result.printError,
          },
          ...current.filter((activity) => activity.productId !== product.id),
        ].slice(0, 8);
      });
      setMessage({
        text: result.printError
          ? `${product.name}: stock updated to ${result.newStock}, but label printing failed.`
          : `${product.name}: added ${received}; stock is now ${result.newStock}${printLabels ? "; label job sent" : ""}.`,
        error: Boolean(result.printError),
      });
      setQuery("");
    } catch (error: any) {
      setMessage({ text: error.message, error: true });
    } finally {
      // Count the duplicate-read window from when the update (and any label
      // job) finished, not from when the scan arrived.
      if (scannerTriggered) lastAcceptedScan.current.at = Date.now();
      setBusy(false);
      refocus();
    }
  };

  const captureBarcode = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.ctrlKey || event.altKey || event.metaKey || busy) return;
    const time = Date.now(),
      state = scanner.current;
    if (event.key === "Enter" || event.key === "Tab") {
      const fast =
          state.value.length >= 4 &&
          time - state.last < 250 &&
          state.started > 0 &&
          time - state.started < 3000,
        barcode = state.value.trim();
      scanner.current = { value: "", started: 0, last: 0 };
      if (!fast) {
        if (event.key === "Enter") {
          event.preventDefault();
          setMessage({
            text: matches.length
              ? "Choose the matching product below to add stock."
              : "No matching product found. Create it before receiving stock.",
            error: !matches.length,
          });
        }
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setQuery(barcode);
      const exact = products.find(
        (product) =>
          product.barcode?.trim().toLowerCase() === barcode.toLowerCase(),
      );
      if (exact) void receive(exact, barcode, true);
      else
        setMessage({
          text: `Barcode ${barcode} is not assigned to a product yet.`,
          error: true,
        });
      return;
    }
    if (event.key.length !== 1) return;
    if (!state.started || time - state.last >= 250)
      scanner.current = {
        value: event.key,
        started: time,
        last: time,
      };
    else
      scanner.current = {
        ...state,
        value: state.value + event.key,
        last: time,
      };
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-[#68736f]">
        Exact scanner matches are received immediately. Manual searches show up
        to ten matching products for confirmation.
      </p>

      <div className="grid grid-cols-[1fr_130px] gap-3">
        <Field label="Barcode or product search">
          <div className="relative">
            <Barcode
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#39786e] pointer-events-none"
            />
            <input
              ref={inputRef}
              autoFocus
              data-autofocus
              className="input !pl-10"
              aria-label="Rapid stock barcode or product search"
              placeholder="Scan barcode or type to search"
              value={query}
              readOnly={busy}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={captureBarcode}
            />
          </div>
        </Field>
        <Field label="Quantity per scan">
          <DraftNumberInput
            className="input"
            min={1}
            max={999}
            step={1}
            value={quantity}
            disabled={busy}
            onValueChange={(value) =>
              setQuantity(Math.max(1, Math.min(999, Math.floor(value))))
            }
          />
        </Field>
      </div>

      <div className="rounded-xl border border-[#deded6] bg-[#fafaf7] p-4">
        <label className="flex items-center gap-2 font-bold text-sm">
          <input
            type="checkbox"
            checked={printLabels}
            disabled={!labelTemplates.length || busy}
            onChange={(event) => setPrintLabels(event.target.checked)}
          />
          <Printer size={16} />
          Print labels automatically
        </label>
        {printLabels && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Field label="Rapid label template">
              <select
                className="input"
                value={templateId}
                disabled={busy}
                onChange={(event) => {
                  const id = event.target.value;
                  setTemplateId(id);
                  try {
                    localStorage.setItem(preferenceKey, id);
                  } catch {
                    // Keep using the selection for this session.
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
            <div>
              <span className="label">Assigned printer</span>
              <div className="input flex items-center">
                {assignedPrinter?.name || "No assigned printer"}
              </div>
            </div>
          </div>
        )}
        {!labelTemplates.length && (
          <p className="text-xs text-[#9b4138] mt-2">
            Assign a saved label template to a label printer to enable automatic
            printing.
          </p>
        )}
      </div>

      <div
        className={`rounded-xl border p-3 text-sm ${
          message.error
            ? "border-[#e7b4af] bg-[#fff1ef] text-[#873c34]"
            : "border-[#b8d9cf] bg-[#edf7f4] text-[#244f48]"
        }`}
      >
        {busy ? "Updating stock…" : message.text}
      </div>

      {query.trim() && (
        <div className="border rounded-xl overflow-hidden">
          <div className="px-3 py-2 bg-[#f7f7f3] text-xs font-bold uppercase tracking-wider text-[#68736f]">
            Matching products
          </div>
          {matches.length ? (
            <div
              role="listbox"
              aria-label="Rapid stock product matches"
              className="divide-y"
            >
              {matches.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  role="option"
                  aria-selected="false"
                  className="w-full px-3 py-3 flex items-center justify-between text-left hover:bg-[#f7fbf9]"
                  disabled={busy}
                  onClick={() =>
                    void receive(product, product.barcode || query, false)
                  }
                >
                  <span>
                    <b>{product.name}</b>
                    <span className="block text-xs text-[#68736f]">
                      {product.barcode || "No barcode"} ·{" "}
                      {product.sku || "No SKU"} · {product.stock} in stock
                    </span>
                  </span>
                  <span className="btn !py-1.5">
                    <Plus size={14} />
                    Add {quantity}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 flex items-center justify-between gap-4">
              <span className="text-sm text-[#68736f]">
                No product matches “{query.trim()}”.
              </span>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onCreateProduct(query.trim())}
              >
                <Plus size={15} />
                Create product
              </button>
            </div>
          )}
        </div>
      )}

      {activities.length > 0 && (
        <div className="border rounded-xl overflow-hidden">
          <div className="px-3 py-2 bg-[#f7f7f3] text-xs font-bold uppercase tracking-wider text-[#68736f]">
            Recent stock updates
          </div>
          <div className="divide-y">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="px-3 py-2.5 flex items-start gap-2 text-sm"
              >
                <CheckCircle2
                  size={16}
                  className={
                    activity.printError
                      ? "text-[#b44b40] mt-0.5"
                      : "text-[#39786e] mt-0.5"
                  }
                />
                <div>
                  <b>{activity.productName}</b> +{activity.quantity}; stock{" "}
                  {activity.newStock}
                  {activity.printMessage && (
                    <div className="text-xs text-[#68736f]">
                      {activity.printMessage}
                    </div>
                  )}
                  {activity.printError && (
                    <div className="text-xs text-[#9b4138]">
                      Label error: {activity.printError}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
