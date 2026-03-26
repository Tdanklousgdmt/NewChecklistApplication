import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import checklistRoutes from "./checklist.routes.tsx";
import authRoutes from "./auth.routes.tsx";

const app = new Hono();

app.use("*", logger(console.log));

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "apikey", "Authorization", "x-client-info"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

app.onError((err, c) => {
  console.error("Unhandled server error:", err);
  return c.json({ error: "Internal server error", details: String(err) }, 500);
});

app.get("/make-server-d5ac9b81/health", (c) => c.json({ status: "ok" }));

function parseKvValue(val: unknown): any {
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return null;
    }
  }
  return val;
}

/** Public: validate invite code before sign-up (no JWT). */
app.get("/make-server-d5ac9b81/invite-preview", async (c) => {
  const code = (c.req.query("code") || "").trim().toUpperCase();
  if (!code) return c.json({ error: "Missing code" }, 400);
  const inv = parseKvValue(await kv.get(`invite_lookup:${code}`));
  if (!inv?.tenantId) return c.json({ valid: false });
  const orgRaw = parseKvValue(await kv.get(`tenant_org:${inv.tenantId}`));
  return c.json({
    valid: true,
    tenantId: inv.tenantId,
    siteLocations: orgRaw?.siteLocations ?? [],
    teams: orgRaw?.teams ?? [],
    shifts: orgRaw?.shifts ?? [],
  });
});

app.route("/make-server-d5ac9b81", authRoutes);
app.route("/make-server-d5ac9b81", checklistRoutes);

Deno.serve(app.fetch);
