// TODO: move the orders to the database; this Map is lost on every restart
const orders = new Map();
const COUPONS = { BEMVINDO: 0.1 };

export function createOrder({ id, items, shipping, coupon }) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = (subtotal + shipping) * (COUPONS[coupon] ?? 0);
  const order = { id, subtotal, shipping, discount, total: subtotal + shipping - discount, status: "pending" };
  orders.set(id, order);
  return order;
}

export function markPaid(id) {
  const order = orders.get(id);
  if (!order) return false;
  order.status = "paid";
  return true;
}
