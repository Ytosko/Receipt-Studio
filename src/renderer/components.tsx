import { X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
export const Field = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <label>
    <span className="label">{label}</span>
    {children}
  </label>
);
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : undefined;
    const frame = requestAnimationFrame(() => {
      const preferred = panel.current?.querySelector<HTMLElement>(
        "[data-autofocus], [autofocus]",
      );
      const first = panel.current?.querySelector<HTMLElement>(
        "input:not(:disabled), textarea:not(:disabled), select:not(:disabled), button:not(:disabled)",
      );
      (preferred || first)?.focus();
    });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      if (previous?.isConnected) requestAnimationFrame(() => previous.focus());
    };
  }, []);
  return (
    <div
      className="fixed inset-0 z-50 bg-[#0c1816aa] backdrop-blur-sm flex items-center justify-center p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`modal-${title.replace(/\W+/g, "-").toLowerCase()}`}
        className={`surface max-h-[90vh] overflow-auto p-6 ${wide ? "w-[760px]" : "w-[480px]"}`}
      >
        <div className="flex justify-between items-center mb-5">
          <h2
            id={`modal-${title.replace(/\W+/g, "-").toLowerCase()}`}
            className="text-xl font-bold"
          >
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close dialog"
            className="btn !p-2"
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export const Empty = ({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) => (
  <div className="surface p-12 text-center border-dashed">
    <div className="w-12 h-12 rounded-2xl bg-[#eee7ff] text-[#6825e9] mx-auto mb-4 flex items-center justify-center text-xl">
      ✦
    </div>
    <h3 className="font-bold text-lg">{title}</h3>
    <p className="text-sm muted text-[#69736f] mt-1 mb-5">{detail}</p>
    {action}
  </div>
);
export function Notice({
  message,
  error = false,
  onClose,
}: {
  message: string;
  error?: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 6000);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);
  return (
    <div
      role={error ? "alert" : "status"}
      className={`fixed z-[80] right-6 bottom-6 max-w-md rounded-xl border px-4 py-3 shadow-2xl flex items-start gap-3 ${error ? "bg-[#fff0ee] border-[#e3aaa3] text-[#7f2f28]" : "bg-[#edf8f3] border-[#a9d6c6] text-[#174f43]"}`}
    >
      <span className="text-sm font-semibold flex-1">{message}</span>
      <button
        type="button"
        aria-label="Dismiss notification"
        className="opacity-70 hover:opacity-100"
        onClick={onClose}
      >
        <X size={16} />
      </button>
    </div>
  );
}
export const Stat = ({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) => (
  <div
    className={`surface p-5 ${accent ? "bg-[#dceee8] !text-[#123f38] border-[#b8d9cf]" : ""}`}
  >
    <p
      className={`text-xs uppercase font-bold tracking-wider ${accent ? "text-[#346b61]" : "text-[#76807d]"}`}
    >
      {label}
    </p>
    <p className="text-2xl font-bold mt-2">{value}</p>
  </div>
);

type DraftNumberProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  value: number;
  onValueChange: (value: number) => void;
  formatValue?: (value: number) => string;
};
export function DraftNumberInput({
  value,
  onValueChange,
  formatValue = String,
  onBlur,
  onFocus,
  ...props
}: DraftNumberProps) {
  const focused = useRef(false),
    [draft, setDraft] = useState(() => formatValue(value));
  useEffect(() => {
    if (!focused.current) setDraft(formatValue(value));
  }, [value, formatValue]);
  return (
    <input
      {...props}
      type="number"
      value={draft}
      onFocus={(event) => {
        focused.current = true;
        onFocus?.(event);
      }}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        if (next.trim() === "" || next === "-" || next === "." || next === "-.")
          return;
        const parsed = Number(next);
        if (Number.isFinite(parsed)) onValueChange(parsed);
      }}
      onBlur={(event) => {
        focused.current = false;
        setDraft(formatValue(value));
        onBlur?.(event);
      }}
    />
  );
}
