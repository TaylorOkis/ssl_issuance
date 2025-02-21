import express from "express";
import "express-async-errors";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";

import morganMiddleware from "./middlewares/morganMiddleware";
import authRouter from "./routes/auth-router";
import notFound from "./middlewares/not-found";
import errorHandler from "./middlewares/error-handler";

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
