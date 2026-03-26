import { Hono } from "hono";
import { handle } from "hono/vercel";
import { app as core } from "../server/app.js";

/**
 * Vercel invokes this for `/api` and `/api/*`. The core Hono app expects paths like
 * `/make-server-d5ac9b81/auth/onboarding` (no `/api` prefix). Nested `route("/api", core)`
 * did not match reliably on Vercel, causing 404 — so we strip `/api` and forward.
 */
const proxy = new Hono();
proxy.all("*", (c) => {
  const url = new URL(c.req.url);
  let path = url.pathname;
  if (path === "/api" || path.startsWith("/api/")) {
    path = path === "/api" ? "/" : path.slice("/api".length);
    url.pathname = path.startsWith("/") ? path : `/${path}`;
  }
  return core.fetch(new Request(url.toString(), c.req.raw));
});

export default handle(proxy);

export const config = {
  runtime: "nodejs",
  maxDuration: 60,
};
