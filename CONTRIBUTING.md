# Contributing to Receipt Studio

Thanks for helping improve Receipt Studio. Bug reports, printer compatibility notes, documentation improvements, translations, and focused code contributions are all welcome.

## Before opening an issue

- Search existing issues for the printer model or problem.
- For printing problems, include the connection type, printer model, paper width, command language, encoding, and whether Windows can print a test page.
- Remove customer, shop, network, and sales information from screenshots and logs.
- Do not post complete backup files because they may contain personal information.

## Development

Receipt Studio requires Node.js 22 and npm on Windows.

```powershell
npm install
npm run dev
```

Before submitting a change, run:

```powershell
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

## Pull requests

- Keep each pull request focused on one feature or fix.
- Explain the user-facing behavior and any printer assumptions.
- Add or update tests when behavior changes.
- Do not commit `dist/`, `release/`, local backups, logs, or customer/shop data.
- Hardware-specific changes should state which physical printer was tested.

By contributing, you agree that your contribution may be distributed under the project’s MIT License.
