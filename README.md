# ShopDesk Admin

A store admin dashboard for managing products, orders, customers, discounts and inventory. It is built with React and TypeScript and runs entirely on local sample data, so no backend, account or API key is needed.

## Features

**Home**
- Net sales, orders, average order value and units sold for a chosen date range, each compared with the previous period
- Sales breakdown (gross sales, discounts, refunds, net sales) and top products by revenue
- Inventory alerts for active products that are out of stock or running low, with a suggested reorder quantity

**Products**
- Searchable, sortable and paginated list with status tabs (active, draft, archived)
- Create and edit form with validation, live profit margin and unique SKUs
- Product page with pricing, sales history, stock level and stock adjustments with a reason for each change

**Orders**
- List with payment and fulfillment filters and search by order number, customer or email
- Order page with line items, a full payment breakdown and the customer's details
- Mark orders as fulfilled, refund chosen items and shipping, and apply or remove discount codes on unpaid orders

**Customers**
- List with email subscription tabs, search by name, email, phone, city or tag, and sorting by amount spent or orders
- Customer page with spending summary, order history, contact details and tags

**Discounts**
- Percentage or fixed amount codes with a minimum subtotal, start and end dates and a usage limit
- Codes are shown as active, scheduled, expired or limit reached

**Look and feel**
- Light and dark themes, following the system setting until you pick one with the switch in the top bar
- Teal accent colour, Plus Jakarta Sans font (bundled, works offline), sidebar icons and a subtle background image
- All colours come from theme variables at the top of `src/styles.css`, so the palette can be changed in one place

## Requirements

- Node.js 20 (see `.nvmrc`)
- npm

## Getting started

```bash
npm ci
npm run dev
```

Then open the URL Vite prints, usually http://localhost:5173.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the test suite once with Vitest |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run typecheck` | Run the TypeScript compiler without emitting |

## Tech stack

- React 18, TypeScript and React Router 7
- Vite 8 for development and builds
- Vitest 4, React Testing Library and jsdom for tests

## Project structure

```
src/
  components/   Shared layout and UI components (tables, forms, badges, tabs)
  data/         Sample products, customers, orders and discount codes
  lib/          Pure business logic: totals, refunds, discounts, stock, sales stats
  pages/        Route-level pages and their tests
  store/        React context stores for products, orders and discounts
  test/         Test setup
```

Business rules live in `src/lib` as plain functions with their own unit tests, so pages stay thin and the rules can be tested without rendering anything.

## How the numbers work

- **Money is stored as integer cents** everywhere, and rounding is always to the nearest cent, so there are no floating point errors.
- **Order totals:** the subtotal is quantity × unit price for each line. A discount comes off the subtotal and never takes it below zero. Tax is charged on the discounted subtotal, not on shipping. Total = subtotal − discount + shipping + tax.
- **Refunds:** each refunded item gives back its price, less its share of the order discount, plus the tax charged on it. Shipping can be refunded once. Refunded units are tracked per line, so nothing can be refunded twice, and the final refund always matches the remaining balance exactly.
- **Discount codes** are checked for their dates, usage limit and minimum subtotal before they are applied. Each use counts against the limit.
- **Stock alerts** cover active products at or below their low stock threshold. The suggested reorder brings stock back to twice the threshold.
- **Sales stats:** orders awaiting payment count as orders but add no money. Net sales is what paid orders brought in after discounts and refunds, including tax and shipping.

## Notes

- Changes are kept in memory, so refreshing the page restores the sample data.
- Date-based features (discount status, dashboard ranges) use the current date. Their tests pin the clock to a fixed date so they keep passing over time.
