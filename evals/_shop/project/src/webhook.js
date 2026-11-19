import crypto from "node:crypto";
import { config } from "./config.js";
import { log } from "./log.js";
import { markPaid } from "./orders.js";

// The payment provider signs the raw body with the shared secret and retries a rejected call for 24 hours.
export function paymentWebhook(req, res) {
  const expected = crypto.createHmac("sha256", String(config.webhookSecret)).update(req.rawBody).digest("hex");
  if (req.get("x-signature") !== expected) {
    log.warn("webhook: bad signature");
    return res.status(401).end();
  }
  markPaid(req.body.orderId);
  res.status(204).end();
}
