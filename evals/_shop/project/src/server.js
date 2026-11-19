import express from "express";
import { requireToken } from "./auth.js";
import { config } from "./config.js";
import { log } from "./log.js";
import { createOrder } from "./orders.js";
import { paymentWebhook } from "./webhook.js";

const app = express();
app.use(express.json({ verify: (req, _res, buffer) => { req.rawBody = buffer; } }));
app.post("/webhooks/payment", paymentWebhook);
app.post("/orders", requireToken, (req, res) => res.status(201).json(createOrder(req.body)));
app.listen(config.port, () => log.info(`listening on ${config.port}`));
