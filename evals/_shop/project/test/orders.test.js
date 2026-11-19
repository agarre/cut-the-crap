import assert from "node:assert/strict";
import test from "node:test";
import { createOrder } from "../src/orders.js";

test("an order without a coupon pays the products plus shipping", () => {
  const order = createOrder({ id: 1, items: [{ price: 50, quantity: 2 }], shipping: 20 });
  assert.equal(order.total, 120);
});

test.skip("BEMVINDO takes 10% off the products only", () => {
  const order = createOrder({ id: 2, items: [{ price: 50, quantity: 2 }], shipping: 20, coupon: "BEMVINDO" });
  assert.equal(order.total, 110);
});
