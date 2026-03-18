import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import checklistRoutes from "./checklist.routes.tsx";

const app = new Hono();

// Logger
app.use("*", logger(console.log));

// CORS — open to all origins, no user auth headers required
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

// Global error handler — prevents "connection closed before message completed"
// by always returning a JSON error instead of letting the connection drop.
app.onError((err, c) => {
  console.error("Unhandled server error:", err);
  return c.json({ error: "Internal server error", details: String(err) }, 500);
});

// Health check
app.get("/make-server-d5ac9b81/health", (c) => c.json({ status: "ok" }));

// Checklist routes
app.route("/make-server-d5ac9b81", checklistRoutes);

Deno.serve(app.fetch);