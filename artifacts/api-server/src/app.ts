import express, { type Express, type Request, type Response, type NextFunction } from "express";
import path from "node:path";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Keep the original root worker URL and revalidation header even though the
// web shell is now a static artifact. This worker still owns only MRG caches.
app.get("/sw.js", (_req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  res.sendFile(path.resolve(import.meta.dirname, "../../mrg", process.env.NODE_ENV === "production" ? "dist/public/sw.js" : "public/sw.js"));
});
app.use("/api", router);
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  res.status(err.status || err.statusCode || 500).json({ message: err.message || "Internal Server Error" });
});

export default app;
