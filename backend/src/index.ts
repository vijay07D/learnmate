import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import router from "./routes";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3001", 10);
const IS_PROD = process.env.NODE_ENV === "production";

// In dev, allow requests from Vite dev server; in prod, same origin
app.use(cors({ origin: IS_PROD ? false : ["http://localhost:5173", "http://localhost:3000"] }));
app.use(express.json({ limit: "2mb" }));

// API routes
app.use("/api", router);

// Serve built React app in production (single port)
const FRONTEND_DIST = path.resolve(__dirname, "../../frontend/dist");
if (IS_PROD && fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  // SPA fallback — all non-API routes serve index.html
  app.get("*", (_req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  });
}

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  const demoMode =
    process.env.DEMO_MODE === "true" ||
    !process.env.IBM_CLOUD_API_KEY ||
    !process.env.IBM_WATSONX_PROJECT_ID;

  console.log(`\n🚀 LearnMate running on http://localhost:${PORT}`);
  console.log(`📡 Mode: ${demoMode ? "⚠️  DEMO (IBM watsonx.ai not connected)" : "✅  LIVE (IBM watsonx.ai connected)"}`);
  console.log(`🖥  Serving: ${IS_PROD ? `frontend from ${FRONTEND_DIST}` : "frontend via Vite on :5173 (dev)"}`);
  if (demoMode) {
    console.log("   Set IBM_CLOUD_API_KEY and IBM_WATSONX_PROJECT_ID in .env to enable real AI calls.\n");
  }
});

export default app;
