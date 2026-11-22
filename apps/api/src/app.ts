import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import authRouter from "./routes/auth.routes";
import healthRouter from "./routes/health.routes";
import ticketsRouter from "./routes/tickets.routes";
import { requestLogger } from "./middlewares/request-logger";
import { errorHandler } from "./middlewares/error-handler";
import commentsRouter from "./routes/comments.routes";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "./docs/openapi";

const app = express();

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    callback(null, origin === undefined || env.CORS_ORIGINS.includes(origin));
  }
}));
app.use(express.json());
app.use(requestLogger);

app.use("/auth", authRouter);
app.use("/health", healthRouter);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.use("/tickets", commentsRouter);
app.use("/tickets", ticketsRouter);

app.use((_req, res) => {
  res.status(404).json({
    data: null,
    error: { message: "Route not found" },
    meta: null
  });
});

app.use(errorHandler);

export default app;