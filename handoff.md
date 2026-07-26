# Receipt Studio — Codex Build Handoff

## Mission

Build a complete, polished, local-first desktop application named **Receipt Studio**.

The app is a lightweight receipt designer and point-of-sale tool for hobby and small-shop use. It must let the user:

- Create multiple shops.
- Create multiple receipt templates for each shop.
- Visually design receipts with drag-and-drop controls.
- Create and manage products.
- Create customers.
- Build a sale by clicking products.
- Select a shop and receipt template.
- Preview the final receipt exactly as it will print.
- Print directly to a Rongta RP336UV 80 mm thermal receipt printer.
- Print through Ethernet using raw TCP at `192.168.68.68:9100`.
- Support USB printing where the operating system exposes the printer.
- Store all data locally without requiring PostgreSQL, MySQL, SQL Server, Docker, cloud services, or any separately installed database.

Do not build accounting, inventory forecasting, purchasing, employee management, online ordering, tax filing, or other unrelated POS features.

The result must be a usable desktop application, not a prototype, mockup, or partial implementation.

---

## Non-negotiable technical decisions

Use this stack:

- **Electron**
- **Vite**
- **React**
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui**
- **dnd-kit** for drag-and-drop
- **Zustand** for application state
- **React Hook Form**
- **Zod** for validation
- **Vitest** for unit tests
- **Playwright** for critical end-to-end tests
- **electron-builder** for Windows packaging

Use the current stable versions that are mutually compatible.

Do not use Next.js.

Do not require a browser extension, print server, cloud backend, or third-party POS application.

Use Electron because a normal browser-based Vite application cannot reliably open raw TCP connections to port 9100 or freely access local printer interfaces.

---

## Operating system target

Primary target:

- Windows 10 and Windows 11, 64-bit.

The application should remain structurally portable to macOS and Linux, but Windows functionality is the priority.

Produce:

- A development command.
- A production build command.
- A Windows installer.
- A portable Windows executable if supported by the packaging setup.

---

## Project structure

Use a clean structure similar to:

```text
receipt-studio/
  src/
    main/
      main.ts
      ipc/
      printing/
      storage/
      security/
    preload/
      preload.ts
      types.d.ts
    renderer/
      App.tsx
      components/
      features/
        dashboard/
        shops/
        products/
        customers/
        sales/
        templates/
        printers/
        settings/
      hooks/
      lib/
      routes/
      state/
      styles/
      types/
  shared/
    schemas/
    types/
    constants/
  tests/
    unit/
    e2e/
  resources/
  electron-builder.yml
  package.json
  vite.config.ts
  tsconfig.json
  README.md
```

Separate Electron main-process code, preload code, renderer code, and shared types clearly.

---

## Security requirements

Use secure Electron defaults:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true` where compatible
- No use of `remote`
- No arbitrary command execution
- No renderer access to Node.js APIs
- All storage, file, network, and printer operations must go through a narrow typed preload API and validated IPC channels.
- Validate every IPC request with Zod.
- Do not expose generic filesystem methods to the renderer.
- Do not expose generic network socket methods to the renderer.
- Restrict navigation and new-window behavior.
- Add a restrictive Content Security Policy.
- Escape user-provided receipt text before HTML rendering.
- Never load remote scripts.

---

## Local storage

Do not require an external database installation.

Use human-readable local JSON files managed by the Electron main process.

Store data under Electron's `app.getPath("userData")` directory.

Suggested structure:

```text
userData/
  data/
    shops.json
    products.json
    customers.json
    sales.json
    templates.json
    printers.json
    settings.json
  assets/
    shop-logos/
  backups/
```

Requirements:

- Use atomic writes: write to a temporary file, validate, then rename.
- Use Zod schemas for all persisted objects.
- Automatically create missing files with valid defaults.
- Recover gracefully from malformed JSON.
- Before replacing malformed data, create a timestamped backup.
- Add a manual "Export backup" action.
- Add a manual "Import backup" action.
- Add automatic rotating backups, keeping the latest 10.
- Generate stable UUIDs for entities.
- Never silently discard user data.

Create a small repository layer so the renderer never reads or writes files directly.

---

## Core data models

Use strict TypeScript types and Zod schemas.

### Shop

```ts
type Shop = {
  id: string;
  name: string;
  legalName?: string;
  addressLines: string[];
  phone?: string;
  email?: string;
  website?: string;
  taxId?: string;
  currency: string;
  locale: string;
  logoAssetId?: string;
  defaultTemplateId?: string;
  defaultPrinterId?: string;
  receiptPrefix?: string;
  nextReceiptNumber: number;
  createdAt: string;
  updatedAt: string;
};
```

Default currency and locale:

- Currency: `USD`
- Locale: `en-US`

Make both editable per shop.

### Product

```ts
type Product = {
  id: string;
  shopIds: string[];
  name: string;
  sku?: string;
  barcode?: string;
  category?: string;
  price: number;
  taxRate?: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
```

Prices must be stored as integer minor units, such as cents, to avoid floating-point errors.

### Customer

```ts
type Customer = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};
```

### Sale

```ts
type Sale = {
  id: string;
  shopId: string;
  templateId: string;
  printerId?: string;
  receiptNumber: string;
  customerId?: string;
  customerSnapshot?: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: "cash" | "card" | "mobile" | "other";
  amountPaid?: number;
  changeDue?: number;
  note?: string;
  status: "completed" | "voided";
  createdAt: string;
};
```

### Sale item

```ts
type SaleItem = {
  id: string;
  productId?: string;
  name: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
};
```

A sale must retain snapshots of names, prices, taxes, and customer data so editing a product later does not alter old receipts.

### Printer profile

```ts
type PrinterProfile = {
  id: string;
  name: string;
  connectionType: "network" | "system";
  network?: {
    host: string;
    port: number;
    timeoutMs: number;
  };
  system?: {
    deviceName: string;
  };
  paperWidthMm: 80 | 58;
  printableWidthMm: number;
  characterWidth: 42 | 48 | 56;
  encoding: string;
  cutAfterPrint: boolean;
  openDrawerAfterPrint: boolean;
  feedLinesAfterPrint: number;
  createdAt: string;
  updatedAt: string;
};
```

Create a default printer profile:

```text
Name: Rongta RP336UV
Connection type: network
Host: 192.168.68.68
Port: 9100
Paper width: 80 mm
Printable width: 72 mm
Character width: 48
Encoding: CP437 or a configurable compatible encoding
Cut after print: true
Feed lines after print: 4
Timeout: 5000 ms
```

The user must be able to edit all printer settings.

---

## Main navigation

Use a left sidebar with:

1. Dashboard
2. New Sale
3. Sales
4. Products
5. Customers
6. Shops
7. Receipt Templates
8. Printers
9. Settings

Show the currently active shop in the top bar.

Use responsive desktop layouts, but optimize for screens at least 1280 pixels wide.

---

## Dashboard

Show:

- Active shop.
- Today's sale count.
- Today's total sales.
- Recent sales.
- Quick button for New Sale.
- Quick button for New Product.
- Printer status summary.
- Warning if no shop, template, or printer is configured.

Do not create complex analytics.

---

## Shop management

Allow:

- Create, edit, duplicate, archive, and delete shops.
- Upload a logo.
- Set default receipt template.
- Set default printer.
- Configure address and contact details.
- Configure currency and locale.
- Configure receipt prefix and next receipt number.

Deleting a shop with existing sales must require explicit confirmation and should normally archive rather than delete it.

---

## Product management

Allow:

- Create, edit, duplicate, archive, and delete products.
- Assign a product to one or more shops.
- Search products.
- Filter by category.
- Sort by name, price, and recently updated.
- Add custom products during a sale without saving them permanently.
- Import products from CSV.
- Export products to CSV.

CSV import must show a preview and validation errors before saving.

---

## Customer management

Allow:

- Create, edit, delete, and search customers.
- Select an existing customer during a sale.
- Add a new customer from the sale screen.
- Continue a sale without a customer.

---

## New Sale screen

This screen should feel like a lightweight POS.

### Layout

Use three main regions:

- Left: searchable and filterable product catalog.
- Center: current cart.
- Right: totals, customer, payment, template, printer, preview, and completion controls.

### Product selection

- Clicking a product adds it to the cart.
- Repeated clicks increase quantity.
- Support search by product name, SKU, or barcode text.
- Show product cards with name and formatted price.
- Allow category filters.
- Allow keyboard navigation.

### Cart

For each line item allow:

- Increase quantity.
- Decrease quantity.
- Enter quantity directly.
- Edit item name for this sale.
- Edit unit price for this sale.
- Add line discount.
- Change tax rate.
- Remove item.
- Add a free-text custom item.

### Totals

Support:

- Subtotal.
- Sale-level fixed discount.
- Sale-level percentage discount.
- Tax.
- Grand total.
- Optional amount paid.
- Calculated change.
- Payment method.
- Optional sale note.

All calculations must use integer minor units and deterministic rounding.

### Completion workflow

The primary button should be **Complete Sale & Print**.

On click:

1. Validate the sale.
2. Reserve and increment the shop receipt number safely.
3. Persist the completed sale.
4. Render the receipt from the selected template.
5. Send the print job.
6. Show a clear result.

If saving succeeds but printing fails:

- Keep the sale.
- Mark or display it as not successfully printed.
- Offer Retry Print.
- Do not create a duplicate sale.

Also provide:

- Complete Sale Without Printing.
- Print Test Receipt.
- Preview Receipt.
- Clear Cart with confirmation.

---

## Sales history

Show a searchable table with:

- Receipt number.
- Date and time.
- Shop.
- Customer.
- Item count.
- Total.
- Payment method.
- Print status.
- Status.

Actions:

- View receipt.
- Reprint.
- Duplicate into a new sale.
- Void sale with confirmation.
- Export receipt as PDF.
- Export sale data as JSON.

Voiding a sale must not delete it.

---

## Receipt template designer

This is a critical feature.

Each shop can have multiple templates.

A template must be visually editable and reusable.

### Designer layout

Use:

- Left panel: block palette.
- Center: 80 mm receipt canvas.
- Right panel: selected block properties.
- Top toolbar: template name, shop, undo, redo, preview, duplicate, save, test print.

### Canvas

Display a realistic 80 mm paper preview.

Use a configurable printable width, defaulting to 72 mm.

Show safe margins and page boundaries.

The template is a vertical sequence of blocks. Dragging should reorder blocks. Some blocks may contain columns or child rows.

Do not make this a completely unrestricted pixel-positioned graphic editor. Thermal receipts need predictable vertical flow. Build a structured drag-and-drop block editor that feels visual and flexible while producing deterministic print output.

### Supported blocks

Implement these block types:

1. Shop logo
2. Shop name
3. Shop contact details
4. Custom text
5. Receipt metadata
6. Customer details
7. Items table
8. Totals
9. Payment details
10. Divider
11. Spacer
12. Barcode
13. QR code
14. Footer message
15. Terms text
16. Date and time
17. Receipt number
18. Cashier/custom label-value rows

### Common block properties

Where relevant support:

- Alignment: left, center, right.
- Bold.
- Underline.
- Font size: small, normal, large, extra large.
- Text transform.
- Top and bottom spacing.
- Visibility rules.
- Custom label.
- Custom static text.
- Dynamic variable insertion.

### Dynamic variables

Support variables such as:

```text
{{shop.name}}
{{shop.address}}
{{shop.phone}}
{{shop.email}}
{{shop.website}}
{{shop.taxId}}
{{receipt.number}}
{{sale.date}}
{{sale.time}}
{{customer.name}}
{{customer.phone}}
{{customer.email}}
{{sale.subtotal}}
{{sale.discount}}
{{sale.tax}}
{{sale.total}}
{{sale.paymentMethod}}
{{sale.amountPaid}}
{{sale.changeDue}}
{{sale.note}}
```

Provide a variable picker instead of requiring users to memorize syntax.

### Items table block

Allow configuration of:

- Show or hide SKU.
- Show or hide quantity.
- Show or hide unit price.
- Show or hide line total.
- Column headings.
- Compact or expanded layout.
- Product name wrapping.
- Separator style.
- Quantity format.
- Price alignment.
- Maximum characters per line.

### Totals block

Allow toggling:

- Subtotal.
- Discount.
- Tax.
- Total.
- Amount paid.
- Change due.

Allow custom labels.

### Visibility rules

Support simple conditions:

- Show customer block only when a customer exists.
- Show tax row only when tax is non-zero.
- Show discount row only when discount is non-zero.
- Show note only when a note exists.
- Show amount paid and change only when entered.

### Undo and redo

Implement reliable undo and redo for template editing.

### Autosave

Autosave template drafts locally, but include an explicit Save button and visible saved/unsaved state.

### Template operations

Allow:

- Create.
- Rename.
- Duplicate.
- Delete.
- Assign to shop.
- Set as shop default.
- Export as JSON.
- Import from JSON.
- Test with sample sale data.
- Test print.

---

## Receipt rendering pipeline

Build one canonical receipt document model.

The same model should power:

- On-screen preview.
- PDF export.
- System print.
- ESC/POS generation.

Avoid maintaining unrelated rendering logic for each output.

Create a normalized intermediate representation such as:

```ts
type ReceiptRenderLine =
  | { type: "text"; text: string; align: "left" | "center" | "right"; bold?: boolean; underline?: boolean; size?: "small" | "normal" | "large" | "xlarge" }
  | { type: "columns"; columns: Array<{ text: string; width: number; align: "left" | "right" }> }
  | { type: "divider"; character: string }
  | { type: "feed"; lines: number }
  | { type: "image"; data: Uint8Array; width: number }
  | { type: "barcode"; value: string; format: string }
  | { type: "qrcode"; value: string };
```

Use deterministic text wrapping based on the printer profile's character width.

Preview must closely match the ESC/POS output.

---

## Printing architecture

Implement printing entirely inside the Electron main process.

Create a typed `PrinterService` interface.

```ts
interface PrinterService {
  listSystemPrinters(): Promise<SystemPrinter[]>;
  testConnection(profile: PrinterProfile): Promise<PrinterTestResult>;
  printReceipt(job: ReceiptPrintJob): Promise<PrintResult>;
}
```

Implement at least:

1. `NetworkEscPosPrinterService`
2. `SystemPrinterService`

### Network printing

For the Rongta printer over Ethernet:

- Use Node.js `net.Socket`.
- Connect to host `192.168.68.68`.
- Connect to port `9100`.
- Make host, port, and timeout configurable.
- Send raw ESC/POS bytes.
- Handle connection refused, timeout, disconnect, partial write, and socket error.
- Close the socket cleanly.
- Do not claim that a successful socket write guarantees physical paper output.
- Return useful diagnostic information.

Provide a **Test Connection** button and a **Print Test Receipt** button.

### ESC/POS support

Implement common ESC/POS commands directly or through a well-maintained library that is compatible with Electron and actively maintained.

Required capabilities:

- Initialize printer.
- Text alignment.
- Bold.
- Underline.
- Text size.
- Line feeds.
- Raster logo printing.
- QR code.
- Barcode where supported.
- Partial or full cut.
- Cash drawer pulse as an optional setting.
- Character encoding selection.

Use common ESC/POS defaults suitable for Rongta-compatible printers, but keep all printer-specific behavior configurable.

Do not hard-code assumptions that prevent other 80 mm printers from working.

### System printer support

List printers available through Electron's printing APIs.

Allow the user to select an installed Windows printer.

For system printing:

- Render a narrow receipt HTML document.
- Print silently when supported and explicitly enabled.
- Otherwise show the operating system print dialog.
- Use page width matching 80 mm and minimal margins.
- Prevent page headers and footers.
- Handle missing or renamed printers.
- Provide a print preview fallback.

USB printing may rely on the printer being installed in Windows as a printer device. Do not require a separate third-party application, but it is acceptable that the operating system needs the appropriate printer driver.

Do not make direct USB VID/PID access mandatory for the first release. Structure the printer layer so a future raw USB implementation can be added.

### Print queue and reliability

Implement a local in-process print queue:

- One job at a time per printer.
- Job statuses: queued, printing, succeeded, failed.
- Retry action.
- Do not automatically print duplicate copies after an uncertain network failure.
- Show error messages in plain language.
- Log technical details locally.

---

## Printer settings screen

Allow:

- Add printer.
- Edit printer.
- Delete printer.
- Select network or system connection.
- Discover/list system printers.
- Configure host and port.
- Configure timeout.
- Configure 80 mm or 58 mm paper.
- Configure printable width.
- Configure characters per line.
- Configure encoding.
- Toggle auto-cut.
- Toggle cash drawer.
- Configure feed lines.
- Test connection.
- Print test receipt.
- Set default printer per shop.

Show the default Rongta network profile on first launch.

Do not attempt broad network scanning automatically.

---

## PDF export

Support exporting any completed receipt as a PDF.

The PDF should:

- Use receipt-width paper.
- Have a height based on content.
- Avoid standard A4 or Letter sizing.
- Match the preview closely.
- Be saved through a native save dialog.

---

## User experience

The interface should look polished and modern but remain simple.

Use:

- Clear empty states.
- Toast notifications.
- Confirmation dialogs for destructive actions.
- Inline validation.
- Loading states.
- Error boundaries.
- Keyboard shortcuts.
- Accessible labels.
- Sensible tab order.
- Visible focus states.
- Light and dark themes.

Suggested shortcuts:

- `Ctrl+N`: new sale.
- `Ctrl+P`: preview or print current sale.
- `Ctrl+S`: save current template.
- `Ctrl+Z`: undo template change.
- `Ctrl+Shift+Z`: redo template change.
- `/`: focus product search.
- `Escape`: close modal or clear selection.

Do not use placeholder buttons. Every visible action must work or be removed.

---

## First-launch flow

On first launch:

1. Create the default Rongta printer profile.
2. Show a short setup wizard.
3. Ask the user to create the first shop.
4. Offer a starter receipt template.
5. Allow a printer connection test.
6. End on the New Sale screen.

Provide a "Skip setup" option, but show clear configuration warnings afterward.

---

## Starter template

Create a clean default 80 mm template containing:

1. Centered shop logo, conditional.
2. Large centered shop name.
3. Centered address and phone.
4. Divider.
5. Receipt number and date/time.
6. Customer block, conditional.
7. Items table.
8. Divider.
9. Subtotal.
10. Discount, conditional.
11. Tax, conditional.
12. Large bold total.
13. Payment method.
14. Amount paid and change, conditional.
15. QR code containing receipt number and total.
16. Centered "Thank you" footer.
17. Feed lines.
18. Cut command.

---

## Logging and diagnostics

Create local logs under the user data directory.

Log:

- App startup.
- Storage validation errors.
- Backup and restore operations.
- Printer connection attempts.
- Print job results.
- Unhandled errors.

Do not log sensitive customer details unnecessarily.

Add a Settings action:

- Open logs folder.
- Copy diagnostics summary.
- Export diagnostics ZIP.

The diagnostics summary should include app version, OS, printer profile metadata, and recent error codes, but not full customer or sales data.

---

## Error handling

Create helpful error messages for:

- Printer unreachable.
- Connection timeout.
- Port closed.
- Invalid IP address.
- Invalid template.
- Missing shop.
- Missing products.
- Invalid price.
- Storage file corruption.
- Permission failure.
- Failed PDF export.
- Missing system printer.
- Failed print.
- Failed backup import.

Technical stack traces belong in logs, not in normal dialogs.

Never leave the UI in a permanent loading state.

---

## Testing requirements

The app is not complete until tests pass.

### Unit tests

Cover at least:

- Money arithmetic.
- Discounts.
- Taxes.
- Rounding.
- Receipt numbering.
- Template variable resolution.
- Conditional block visibility.
- Text wrapping.
- Column layout.
- JSON schema validation.
- Backup import validation.
- ESC/POS byte generation.
- Network printer timeout handling.
- Sale snapshot behavior.

### End-to-end tests

Cover at least:

1. First launch and shop setup.
2. Create a product.
3. Create a customer.
4. Create a receipt template.
5. Add products to a sale.
6. Edit quantity and price.
7. Complete sale without printing.
8. View sale history.
9. Reopen a saved sale receipt.
10. Export receipt as PDF.
11. Configure the Rongta network printer.
12. Trigger a test print using a mocked printer socket.
13. Handle an unreachable printer without losing the sale.
14. Export and import a backup.

Mock external printer communication in automated tests.

Do not require a physical printer for the test suite.

---

## Quality gates

Before declaring completion, run and fix all failures from:

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run dist
```

Add these scripts to `package.json`.

No TypeScript errors.

No ESLint errors.

No failing tests.

No broken imports.

No blank screens.

No unhandled promise rejections.

No placeholder TODOs in core functionality.

No fake data remaining except explicit demo/sample data.

No secrets or machine-specific absolute paths.

---

## README requirements

Write a complete `README.md` that includes:

- What the app does.
- Screenshots section with placeholders explaining where screenshots should go.
- Requirements.
- Installation.
- Development commands.
- Production build commands.
- Windows packaging.
- Local data location.
- Backup and restore.
- Rongta network printer setup.
- How to verify the printer IP and port.
- How to use USB/system printer mode.
- Common Windows firewall issues.
- Troubleshooting port 9100.
- Test receipt procedure.
- Explanation that raw TCP write success does not prove paper physically printed.
- How to reset the application safely.
- Known limitations.
- Architecture overview.

Include this Windows connectivity test example in the README:

```powershell
Test-NetConnection 192.168.68.68 -Port 9100
```

Also explain that the computer and printer must normally be on the same local network.

---

## Important implementation constraints

- Do not create a web-only app.
- Do not use localStorage as the primary data store.
- Do not require an external database.
- Do not require a cloud account.
- Do not require internet access during normal use.
- Do not use browser print as the only print method.
- Do not silently swallow errors.
- Do not use floating-point arithmetic for money.
- Do not mutate historical sales when products or customers are edited.
- Do not couple the receipt designer directly to one printer model.
- Do not place network or filesystem logic in React components.
- Do not expose unsafe Electron APIs.
- Do not leave the repository in a partially generated state.

---

## Execution instructions for Codex

Work autonomously through the full implementation.

1. Inspect the existing project before changing files.
2. Preserve useful existing configuration when compatible.
3. Create a detailed internal implementation plan.
4. Build the app feature by feature.
5. Run checks frequently.
6. Fix errors instead of merely reporting them.
7. Use mocks for printer tests.
8. Finish all core workflows.
9. Run every quality-gate command.
10. Provide a concise completion report containing:
   - Features implemented.
   - Files and architecture created.
   - Commands run.
   - Test results.
   - Build artifact locations.
   - Any genuine hardware-dependent limitation.

Do not stop after scaffolding.

Do not ask the user to choose routine implementation details already specified here.

Make reasonable, conservative decisions where a minor detail is unspecified.

A physical Rongta printer cannot be guaranteed or fully verified by automated code alone. Implement the software path, connection testing, raw ESC/POS output, clear diagnostics, and mocked tests so that only final real-hardware verification remains.

---

## Definition of done

The project is done only when a user can:

1. Install and open the Windows desktop app.
2. Create a shop.
3. Add products.
4. Add a customer.
5. create or edit a receipt template visually.
6. Start a new sale.
7. Click products to add them.
8. Adjust quantities, prices, discount, tax, and payment.
9. Preview the exact receipt.
10. Save the sale.
11. Print it to `192.168.68.68:9100`.
12. Reprint it from sales history.
13. Export it as a receipt-width PDF.
14. Back up and restore all local data.
15. Close and reopen the app without losing data.

Build the complete application now.
