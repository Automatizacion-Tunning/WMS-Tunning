import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

const nodeEnv = process.env.NODE_ENV ?? "production";
app.set("env", nodeEnv);

const isProduction = nodeEnv === "production";
if (isProduction && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set in production");
}

// Configurar sesiones
// Permite a Express conocer el esquema original cuando está detrás de un proxy
app.set("trust proxy", 1);

const secureCookie: boolean | "auto" =
  process.env.COOKIE_SECURE !== undefined
    ? process.env.COOKIE_SECURE === "true"
    : "auto";

const sameSite = process.env.COOKIE_SAME_SITE as
  | boolean
  | "lax"
  | "strict"
  | "none"
  | undefined;

app.use(session({
  secret: process.env.SESSION_SECRET || "wms-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: secureCookie,
    httpOnly: true,
    ...(sameSite ? { sameSite } : {}),
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (!isProduction) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  //const port = 5000;
  const port = parseInt(process.env.PORT || "5000", 10)
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();

