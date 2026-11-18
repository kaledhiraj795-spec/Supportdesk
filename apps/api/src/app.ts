import express from "express";
import healthRouter from "./routes/health.routes";
import ticketsRouter from "./routes/tickets.routes";
import { requestLogger } from "./middlewares/request-logger";
import { errorHandler } from "./middlewares/error-handler";

const app = express();

app.use(express.json());
app.use(requestLogger);

app.use("/health", healthRouter);
app.use("/tickets", ticketsRouter);

app.use(errorHandler);

export default app;