# Banko Chow CI

Order tests for [Banko Chow](https://bankochow.com). This repository is public so GitHub Actions minutes are free.

The app and the signed releases stay on the private repository `bankochow/banko-app`.

## What runs here

A push to `main` runs `npm test` on Ubuntu. The tests check:

- menu prices, including extras
- the ₦1,900 delivery base fare, and the longer zones
- an address picking its delivery area
- the Paystack checkout request, using an example key only

Nothing in this repo can charge a card. There is no Paystack secret here.

## What stays on the private repo

- The website deploys from `bankochow/banko-app` `main` through Cloudflare Pages.
- iOS TestFlight is a manual release workflow on that repo.
- The iOS and Android apps are the website in a Capacitor shell. A web change is the mobile change. The usual iOS check is to build that shell and look at the screens.

When pricing or checkout code changes on the private repo, copy these files here so the tests still match production:

- `src/config/site.ts`
- `src/data/catalog.ts`
- `src/data/delivery.ts`
- `src/lib/api-url.ts`
- `src/lib/format.ts`
- `src/lib/paid-bag.ts`
- `src/lib/quote.ts`
- `src/server/api.ts`
- `src/server/paystack.ts`
- `tests/checkout.test.ts`
- `tests/paid-bag.test.ts`
- `tests/delivery.test.ts`
