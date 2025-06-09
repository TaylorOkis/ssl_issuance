import express from "express";
import "express-async-errors";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";

import "./utils/cron_jobs/token-cleanup.js";
import morganMiddleware from "./middlewares/morgan.js";
import authRouter from "./routes/auth-router.js";
import notFound from "./middlewares/not-found.js";
import errorHandler from "./middlewares/error-handler.js";
import acmeRouter from "./routes/acme-router.js";
import validateRouter from "./routes/validate-router.js";
import domainRouter from "./routes/domain-router.js";
import verifyRouter from "./routes/verify-router.js";
import sslRouter from "./routes/ssl-router.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.join(__dirname, "uploads", "SSL_CERT.swagger.json");

const swaggerDocument = JSON.parse(fs.readFileSync(filePath, "utf-8"));

const corsOptions = {
  origin: "http://localhost:3000",
  credentials: true,
};

app.use(express.json());
app.use(cors(corsOptions));
app.use(cookieParser(process.env.JWT_SECRET));
app.use(morganMiddleware);

app.get("/", (req, res) => {
  res.status(200).send("App is running perfectly");
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use("/auth", authRouter);
app.use("/acme", acmeRouter);
app.use("/validate", validateRouter);
app.use("/domain", domainRouter);
app.use("/verify", verifyRouter);
app.use("/ssl", sslRouter);

// Error middleware
app.use(notFound);
app.use(errorHandler);

function start() {
  try {
    app.listen(PORT, () => {
      console.log(`App is running on port ${PORT}...`);
    });
  } catch (error) {
    console.log(
      `An error occurred when initializing the app.\n Error: ${error} `
    );
  }
}

start();
