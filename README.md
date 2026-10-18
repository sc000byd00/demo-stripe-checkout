# Case study: Stripe Checkout in a Next.js app

A demo project: adding paid tickets to a small Next.js site with Stripe Checkout, the way I deliver integration jobs. The brief is modeled on typical job postings; there is no client behind it. Everything runs in Stripe test mode.

## The brief

> We sell two workshops on our Next.js site. Add a "Buy ticket" button that takes people to Stripe, and mark the order as paid once the payment has gone through. Show a confirmation page afterwards.

## Acceptance criteria

Agreed before starting, ticked off at handover:

- [x] Each workshop has a "Buy ticket" button that opens Stripe Checkout.
- [x] The price comes from the server; changing it in the browser has no effect.
- [x] An order is marked as paid only by a verified Stripe webhook, not by the redirect back to the site.
- [x] Requests with a missing or wrong signature are rejected.
- [x] Stripe retrying the same event does not process it twice.
- [x] Delayed payment methods (e.g. SEPA Direct Debit) are only fulfilled once the money has arrived; failures are recorded.
- [x] Abandoned checkouts are marked as expired.
- [x] The confirmation page shows "processing" until the webhook arrives, then "payment received".

## What the common shortcuts get wrong

Integrations built quickly, by hand or with AI tools, often break in the same places. This demo handles each of them:

| Shortcut | Problem | Here |
| --- | --- | --- |
| Treating the success URL as proof of payment | Anyone can open `/success` without paying | Only the webhook sets `paid`; the page just shows the recorded status |
| Sending the price from the browser | Buyers can change it | The browser sends a product id; prices live in [`catalog.ts`](src/lib/catalog.ts) |
| Parsing the webhook body as JSON before verifying it | The signature check fails or gets skipped | The raw body is verified with `constructEvent` in [`route.ts`](src/app/api/stripe/webhook/route.ts) |
| Ignoring retries | Orders fulfilled twice | Processed event ids are stored |
| Fulfilling on `checkout.session.completed` alone | SEPA and similar methods are not paid yet at that point | `payment_status` is checked; `async_payment_succeeded` / `failed` are handled |
| Not checking the amount | A mismatch goes unnoticed | Amount and currency must match the order |

## How it was verified

- 11 tests (`npm test`). The webhook tests sign their payloads with the Stripe SDK's own test helper, so the real signature check runs; no network access is needed.
- Type check, lint and production build pass.

## Run it yourself

1. Create a free Stripe account and copy the **test** secret key.
2. Install the [Stripe CLI](https://docs.stripe.com/stripe-cli) and run `stripe listen --forward-to localhost:3000/api/stripe/webhook`. It prints a webhook secret.
3. Copy `.env.example` to `.env.local` and fill in both values.
4. `npm install`, then `npm run dev`, and open <http://localhost:3000>.
5. Pay with the test card `4242 4242 4242 4242`, any future date, any CVC.

Orders are stored in `.data/orders.json` to keep the demo free of a database. In production this would be a table with unique indexes on the session id and on processed event ids.

## Stack

Next.js 15 (App Router, Server Actions, Route Handlers), React 19, TypeScript, Tailwind CSS 4, Stripe Node SDK 23, Vitest.

## About

I fix and finish AI-built web apps (Lovable, Bolt, Next.js, Supabase): auth and data bugs, integrations such as Stripe, deployment. I work AI-assisted with Claude Code and test every change myself. Fixed price, agreed scope, written acceptance criteria.

See also: [demo-auth-fix](https://github.com/sc000byd00/demo-auth-fix), a case study on fixing auth and data bugs in a Next.js + Supabase app.
