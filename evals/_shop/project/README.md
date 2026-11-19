# orders-api

Small order API for a shop: it creates orders, applies coupons, and marks an order as paid when the payment provider calls the webhook.

- `src/server.js` wires the middleware and the routes
- `src/config.js` reads the environment
- `deploy/stack.yml` is what production runs (Docker Swarm)
- `logs/app.log` is yesterday's production log
- `docs/` holds the diff and the CI log of the open pull request

Deploys go out with `docker stack deploy -c deploy/stack.yml orders`.
