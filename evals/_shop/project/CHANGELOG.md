# Changelog

## 1.8.0 — 2026-03-10

- Config: every environment variable now carries the `ORDERS_` prefix (`ORDERS_PORT`, `ORDERS_DB_URL`, `ORDERS_API_TOKEN`, `ORDERS_WEBHOOK_SECRET`).
- Orders: the coupon `BEMVINDO` gives 10% off.

## 1.7.2 — 2026-02-21

- Webhook: payloads without a valid signature are rejected.
