import express from "express";
import "express-async-errors";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("App is running perfectly");
});

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
