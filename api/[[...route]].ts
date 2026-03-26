import { Hono } from "hono";
import { handle } from "hono/vercel";
import { app as checklistApi } from "../server/app.js";

/**
 * Optional catch-all so Vercel invokes this function for /api and every /api/* path.
 * (api/index.ts only matched the exact path /api, so /api/make-server-d5ac9b81/... returned 404.)
 */
const root = new Hono();
root.route("/api", checklistApi);

export default handle(root);

export const config = {
  runtime: "nodejs",
  maxDuration: 60,
};
