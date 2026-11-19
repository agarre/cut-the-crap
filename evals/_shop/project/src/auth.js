import { config } from "./config.js";

export function requireToken(req, res, next) {
  if (req.get("authorization") !== `Bearer ${config.apiToken}`) return res.status(401).end();
  next();
}
