// Every setting comes from the environment; production sets them in deploy/stack.yml.
export const config = {
  port: Number(process.env.ORDERS_PORT ?? 3000),
  dbUrl: process.env.ORDERS_DB_URL,
  apiToken: process.env.ORDERS_API_TOKEN,
  webhookSecret: process.env.ORDERS_WEBHOOK_SECRET,
};
