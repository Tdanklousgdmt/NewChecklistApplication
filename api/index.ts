import { Hono } from "hono";
import { handle } from "hono/vercel";
import { app as checklistApi } from "../server/app.js";

/** Vercel serves this file at /api/* ; mount inner app so paths stay /api/make-server-d5ac9b81/... */
const root = new Hono();
root.route("/api", checklistApi);

export default handle(root);

export const config = {
  runtime: "nodejs",
  maxDuration: 60,
};
