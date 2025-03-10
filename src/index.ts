import express from "express";
import "express-async-errors";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";

import "./utils/cron_jobs/token-cleanup";
import morganMiddleware from "./middlewares/morgan";
import authRouter from "./routes/auth-router";
import notFound from "./middlewares/not-found";
import errorHandler from "./middlewares/error-handler";
import acmeRouter from "./routes/acme-router";
import validateRouter from "./routes/validate-router";
import domainRouter from "./routes/domain-router";
import verifyRouter from "./routes/verify-router";
import sslRouter from "./routes/ssl-router";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());
app.use(cookieParser(process.env.JWT_SECRET));
app.use(morganMiddleware);

app.get("/", (req, res) => {
  res.status(200).send("App is running perfectly");
});

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
